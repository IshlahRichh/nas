import { FC } from 'react';

interface IconMenuDotsProps {
    className?: string;
    fill?: boolean;
    duotone?: boolean;
}

const IconMenuDots: FC<IconMenuDotsProps> = ({ className, fill = false, duotone = true }) => {
    return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
            <circle cx="5" cy="12" r="2" fill="currentColor" opacity={duotone ? '0.5' : '1'} />
            <circle cx="12" cy="12" r="2" fill="currentColor" />
            <circle cx="19" cy="12" r="2" fill="currentColor" opacity={duotone ? '0.5' : '1'} />
        </svg>
    );
};

export default IconMenuDots;
