import medlinkLogo from '@/assets/medlink-africa-logo.png';
import { cn } from '@/lib/utils';

/**
 * Official MedLink Africa brand mark (horizontal lockup).
 * Adjust size with className, e.g. `className="h-9 max-w-[160px]"`.
 */
export function MedLinkLogo({ className, alt = 'MedLink Africa', ...props }) {
    return (
        <img
            src={medlinkLogo}
            alt={alt}
            decoding="async"
            className={cn('h-11 w-auto max-w-[min(100%,220px)] object-contain object-left', className)}
            {...props}
        />
    );
}
