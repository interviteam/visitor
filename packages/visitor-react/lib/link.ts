import React, { DetailedHTMLProps, useCallback, createElement, useState, useMemo, ReactNode, ReactElement, AnchorHTMLAttributes } from 'react';
import { $get } from '@interactivevision/visitor';
import { useLocation } from './context';

type AnchorProps = DetailedHTMLProps<AnchorHTMLAttributes<HTMLAnchorElement>, HTMLAnchorElement>;

type LoadingState = {
  isActive: boolean;
  isPending: boolean;
}

type RendererProps = AnchorProps & LoadingState;
type Renderer = (props: RendererProps) => ReactElement;
type ClassNameBuilder = (props: LoadingState) => string | undefined;

type Props = Omit<AnchorProps, 'className' | 'children'> & {
  className?: ClassNameBuilder | string | undefined;
  children?: Renderer | ReactNode | undefined;
  end?: boolean;
};

export default function Link({ href, target, className, children, end, onClick, ...props }: Props) {
  const location = useLocation();

  const [isPending, setIsPending] = useState(false);

  const isActive = useMemo(() => {
    if (!href) {
      return false;
    }

    let isExact = location === href;
    let isIncluded = (!end && location.startsWith(href));

    return isExact || isIncluded;
  }, [location, href, end]);

  const handleClick = useCallback((event: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
    if (onClick) {
      onClick(event);
    }

    if (!href) {
      return;
    }

    if (!shouldInterceptEvent(event, href, target)) {
      return;
    }

    event.preventDefault();
    setIsPending(true);

    $get(href).then(() => setIsPending(false));
  }, [href, target]);

  const properties = {
    href,
    target,
    className: typeof className === 'function' ? className({ isActive, isPending }) : className,
    onClick: handleClick,
    ...props,
  };

  if (typeof children === 'function') {
    return children({ isActive, isPending, ...properties });
  }

  return createElement('a', properties, children);
};

function shouldInterceptEvent(event: React.MouseEvent<HTMLAnchorElement, MouseEvent>, href: string, target?: string) {
  if (target === '_blank' || isCrossOriginHref(href)) {
    return false;
  }

  return !(
    event.defaultPrevented ||
    event.button > 1 ||
    event.altKey ||
    event.ctrlKey ||
    event.metaKey ||
    event.shiftKey
  );
}

function isCrossOriginHref(href: string) {
  try {
    let currentOrigin = window.location.host;
    let targetOrigin = new URL(href).host;

    return currentOrigin !== targetOrigin;
  } catch (e) {
    return false;
  }
}
