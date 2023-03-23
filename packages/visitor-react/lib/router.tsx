import { useState, useEffect, createElement, ComponentType } from 'react';
import { Finder, State, $init, ComponentState } from '@interactivevision/visitor';
import { VisitorContext } from './context';

export type RouterProps = State & {
  finder: Finder;
  component: ComponentType;
}

export function Router({ finder, component, ...state }: RouterProps) {
  const [visitor, setVisitor] = useState({ component, ...state });

  useEffect(() => {
    $init({ state, finder, update: (state) => setVisitor(state) });
  }, []);

  return createElement(VisitorProvider, visitor);
}

function VisitorProvider({ component, location, props, session, query, shared }: ComponentState) {
  let parsed = location.replace(/[^a-z0-9]/ig, '-');
  let key = `visitor-page-${parsed}`;
  let value = { session, shared, query, location };
  let children;

  if (component.layout) {
    children = createElement(component.layout, shared, createElement(component, { key, ...props }));
  } else {
    children = createElement(component, { key, ...props });
  }

  return createElement(VisitorContext.Provider, { value }, children);
}
