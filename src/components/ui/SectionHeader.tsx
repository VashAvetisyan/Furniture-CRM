import Link from 'next/link';
import { ChevronRightIcon } from '@/components/icons';

interface SectionHeaderProps {
  title: string;
  href: string;
}

export default function SectionHeader({ title, href }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-lg font-bold text-dark">{title}</h2>
      <Link
        href={href}
        className="text-sm text-primary font-medium flex items-center gap-0.5 hover:underline"
      >
        Տեսնել բոլորը <ChevronRightIcon className="w-4 h-4" />
      </Link>
    </div>
  );
}
