import React from 'react';
import { clsx } from 'clsx';

const VARIANT = {
  primary: 'btn-primary',
  success: 'btn-success',
  danger: 'btn-danger',
  ghost: 'btn-ghost'
};

const SIZE = {
  sm: 'px-2.5 py-1.5 text-[10px]',
  md: 'px-3 py-2 text-[11px]',
  lg: 'px-4 py-2.5 text-xs'
};

const Button = ({
  as: Comp = 'button',
  variant = 'ghost',
  size = 'md',
  className,
  type = 'button',
  ...props
}) => {
  return (
    <Comp
      type={Comp === 'button' ? type : undefined}
      className={clsx('btn', VARIANT[variant] || VARIANT.ghost, SIZE[size] || SIZE.md, className)}
      {...props}
    />
  );
};

export default Button;
