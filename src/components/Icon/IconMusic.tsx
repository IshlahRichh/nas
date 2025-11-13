import { FC } from 'react';

interface IconMusicProps {
  className?: string;
  fill?: boolean;
  duotone?: boolean;
}

const IconMusic: FC<IconMusicProps> = ({
  className,
  fill = false,
  duotone = true,
}) => {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Note stem and flag */}
      <path
        d="M8 18V7C8 6 8 5 9 5H10C11 5 11 6 11 7V18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={duotone ? '0.5' : '1'}
      />
      <path
        d="M17 15V6C17 5 17 4 18 4H19C20 4 20 5 20 6V15"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={duotone ? '0.5' : '1'}
      />
      
      {/* Note heads (circles) */}
      <circle
        cx="9.5"
        cy="18"
        r="2.5"
        fill={fill ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="2"
      />
      <circle
        cx="18.5"
        cy="15"
        r="2.5"
        fill={fill ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="2"
      />
      
      {/* Connecting beam */}
      <path
        d="M11 7H20"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
};

export default IconMusic;
