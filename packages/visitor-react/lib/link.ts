import React, { DetailedHTMLProps, HTMLAttributes, ReactNode, FunctionComponent, useCallback, createElement, useState, useMemo } from 'react';
import { router } from '@interactivevision/visitor';
import { useLocation } from './location';

type LinkAnchorProps = DetailedHTMLProps<HTMLAttributes<HTMLAnchorElement>, HTMLAnchorElement>;
type LinkChildrenRenderer = (options: { isActive: boolean, isPending: boolean }) => ReactNode | undefined;
type LinkClassNameBuilder = (options: { isActive: boolean, isPending: boolean }) => string | undefined;
type LinkProps = Omit<LinkAnchorProps, 'href' | 'className'> & {
  href: string;
  end?: boolean
  className?: LinkClassNameBuilder | string | undefined;
  children?: LinkChildrenRenderer | ReactNode | undefined;
};

export const Link: FunctionComponent<LinkProps> = ({
  href,
  className,
  children,
  end = false,
  onClick = () => {},
  ...props
}) => {
  const location = useLocation();
  const isActive = useMemo(() => location === href || (!end && location.startsWith(href)), [location]);
  const [isPending, setIsPending] = useState(false);

  const handleClickEvent = useCallback((event: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
    onClick(event);

    if (!shouldInterceptEvent(event)) {
      return;
    }

    event.preventDefault();

    setIsPending(true);

    router.dispatch(href).then(() => setIsPending(false));
  }, [href]);

  return createElement(
    'a',
    {
      href,
      className: typeof className === 'function' ? className({ isActive, isPending }) : className,
      onClick: handleClickEvent,
      ...props,
    },
    typeof children === 'function' ? children({ isActive, isPending }) : children,
  );
};

export const shouldInterceptEvent = (event: React.MouseEvent<HTMLAnchorElement, MouseEvent>): boolean => !(
  event.defaultPrevented ||
  event.button > 1 ||
  event.altKey ||
  event.ctrlKey ||
  event.metaKey ||
  event.shiftKey
);

export default Link;
