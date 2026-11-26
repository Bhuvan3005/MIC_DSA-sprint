import { Loader2 } from 'lucide-react';
import { cn } from '../../utils/format';

export const Spinner = ({ className }) => <Loader2 className={cn('animate-spin', className)} size={18} aria-label="Loading" />;
