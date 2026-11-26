import { Link } from 'react-router-dom';
import mark from '../../assets/mic.webp';

export default function Logo({ to = '/', compact }) {
  return (
    <Link to={to} className="flex items-center gap-2.5" aria-label="CodeSprint home">
      <img src={mark} alt="" className="h-9 w-auto rounded-lg bg-white p-1" />
      {!compact && <span className="font-heading font-semibold text-2xl leading-none text-white">CodeSprint</span>}
    </Link>
  );
}
