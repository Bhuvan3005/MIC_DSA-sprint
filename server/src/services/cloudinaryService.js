const { v2: cloudinary } = require('cloudinary');
const env = require('../config/env');
const AppError = require('../utils/AppError');

if (env.cloudinaryConfigured) {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

function assertConfigured() {
  if (!env.cloudinaryConfigured) {
    throw new AppError(503, 'Video storage is not configured. Set the CLOUDINARY_* environment variables.', 'CLOUDINARY_NOT_CONFIGURED');
  }
}

/** Signs a direct-to-Cloudinary upload. The API secret never leaves the server. */
function createUploadSignature() {
  assertConfigured();
  const timestamp = Math.round(Date.now() / 1000);
  const paramsToSign = { timestamp, folder: env.CLOUDINARY_FOLDER, allowed_formats: env.videoAllowedFormats.join(',') };
  const signature = cloudinary.utils.api_sign_request(paramsToSign, env.CLOUDINARY_API_SECRET);
  return {
    signature, timestamp,
    apiKey: env.CLOUDINARY_API_KEY,
    cloudName: env.CLOUDINARY_CLOUD_NAME,
    folder: paramsToSign.folder,
    allowedFormats: paramsToSign.allowed_formats,
    uploadUrl: `https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/video/upload`,
    maxBytes: env.videoMaxBytes,
  };
}

const thumbnailFor = (publicId, cloud = env.CLOUDINARY_CLOUD_NAME) =>
  `https://res.cloudinary.com/${cloud}/video/upload/so_2,w_640,h_360,c_fill/${publicId}.jpg`;

/**
 * Confirms an uploaded asset really exists in our Cloudinary account and respects our limits.
 * Returns trusted metadata read from Cloudinary (not from the client).
 */
async function inspectUploadedVideo(publicId) {
  assertConfigured();
  if (!publicId.startsWith(`${env.CLOUDINARY_FOLDER}/`)) {
    throw new AppError(400, 'Video does not belong to the configured upload folder', 'BAD_ASSET');
  }
  let res;
  try {
    res = await cloudinary.api.resource(publicId, { resource_type: 'video' });
  } catch {
    throw new AppError(422, 'Uploaded video was not found in Cloudinary', 'ASSET_NOT_FOUND');
  }
  const format = String(res.format || '').toLowerCase();
  if (!env.videoAllowedFormats.includes(format) || res.bytes > env.videoMaxBytes) {
    await destroyVideo(publicId);
    throw new AppError(422, `Video rejected: allowed formats ${env.videoAllowedFormats.join(', ')}, max ${env.VIDEO_MAX_SIZE_MB}MB`, 'ASSET_REJECTED');
  }
  return {
    secureUrl: res.secure_url, duration: Math.round(res.duration || 0), bytes: res.bytes, format,
    thumbnailUrl: thumbnailFor(publicId),
  };
}

async function destroyVideo(publicId) {
  if (!env.cloudinaryConfigured || !publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: 'video', invalidate: true });
  } catch (err) {
    console.error('[cloudinary] failed to delete asset', publicId, err.message);
  }
}

module.exports = { createUploadSignature, inspectUploadedVideo, destroyVideo, thumbnailFor };
