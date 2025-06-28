import React from 'react';

interface UserAvatarProps {
  name: string;
  photoUrl?: string;
  size?: number;
  className?: string;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  name,
  photoUrl,
  size = 32,
  className = '',
}) => {
  const fallbackUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(
    name || 'User'
  )}&background=random&color=fff`;

  const [src, setSrc] = React.useState(photoUrl || fallbackUrl);

  return (
    <img
      src={src}
      alt={name || 'User'}
      className={`rounded-full object-cover ${className}`}
      style={{ width: size, height: size }}
      onError={() => setSrc(fallbackUrl)}
    />
  );
};