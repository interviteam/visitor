import React, { DetailedHTMLProps, HTMLAttributes, FunctionComponent, useCallback, createElement, useState, useMemo, ReactNode, ReactElement } from 'react';
import { router } from '@interactivevision/visitor';
import { useLocation } from './context';

type LinkAnchorProps = DetailedHTMLProps<HTMLAttributes<HTMLAnchorElement>, HTMLAnchorElement>;
type LinkRendererProps = { href: string, onClick: (event: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => void };
type LinkChildrenRenderer = (options: { isActive: boolean, isPending: boolean, props: LinkRendererProps }) => ReactElement;
type LinkClassNameBuilder = (options: { isActive: boolean, isPending: boolean }) => string | undefined;
type LinkProps = Omit<LinkAnchorProps, 'href' | 'className' | 'children'> & {
  href: string;
  end?: boolean;
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
  const normalized = normalizeHref(href);
  const location = useLocation();
  const isActive = useMemo(() => location === normalized || (!end && location.startsWith(normalized)), [location]);
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

  if (typeof children === 'function') {
    return children({
      isActive,
      isPending,
      props: { href, onClick: handleClickEvent },
    });
  }

  return createElement(
    'a',
    {
      href,
      className: typeof className === 'function' ? className({ isActive, isPending }) : className,
      onClick: handleClickEvent,
      ...props,
    },
    children,
  );
};

export const normalizeHref = (href: string) => {
  const hasHost = /^https?:\/\//.test(href);

  if (hasHost) {
    return (new URL(href)).pathname;
  }

  return href;
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
