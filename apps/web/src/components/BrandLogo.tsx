import { Link } from 'react-router-dom';

export const DAPS_LOGO_URL =
  'https://dapsanalytics.com/assets/images/daps-logo-nav.svg';

interface BrandLogoProps {
  to?: string;
}

export function BrandLogo({ to = '/organizations' }: BrandLogoProps) {
  return (
    <Link to={to} className="brand-logo-link" aria-label="DAPS Project Tracker">
      <img
        src={DAPS_LOGO_URL}
        alt="DAPS Project Tracker"
        className="brand-logo-img"
      />
    </Link>
  );
}
