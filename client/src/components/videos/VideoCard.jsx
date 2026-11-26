import { Link } from 'react-router-dom';
import { Play } from 'lucide-react';
import { DifficultyBadge, TopicTags } from '../common/ui';
import { formatDuration } from '../../utils/format';

export default function VideoCard({ video }) {
  const slug = video.question?.slug || video.id;
  return (
    <Link to={`/videos/${slug}`} className="card card-hover group flex flex-col overflow-hidden">
      <div className="relative aspect-video bg-ink-700">
        {video.thumbnailUrl
          ? <img src={video.thumbnailUrl} alt="" loading="lazy" className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
          : <div className="h-full w-full bg-ink-600" />}
        <div className="absolute inset-0 grid place-items-center bg-black/30 opacity-0 transition group-hover:opacity-100">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-white/90 text-ink-900"><Play size={20} fill="currentColor" /></span>
        </div>
        {video.duration > 0 && <span className="absolute bottom-2 right-2 rounded bg-black/75 px-1.5 py-0.5 font-mono text-xs text-white">{formatDuration(video.duration)}</span>}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 font-semibold text-white">{video.title}</h3>
          {video.difficulty && <DifficultyBadge level={video.difficulty} />}
        </div>
        <TopicTags topics={video.topics} max={3} />
      </div>
    </Link>
  );
}
