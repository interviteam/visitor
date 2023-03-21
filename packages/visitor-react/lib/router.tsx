import { useState, useCallback, useEffect, createElement } from 'react';
import { Finder, State, router, defaultSession } from '@interactivevision/visitor';
import { VisitorContext } from './context';

export type RouterProps = State & {
  finder: Finder;
  component: any;
};

export function Router({ finder, component, ...state }: RouterProps) {
  const [session, setSession] = useState(state.session || defaultSession);
  const [shared, setShared] = useState(state.shared || {});
  const [location, setLocation] = useState(state.location);
  const [query, setQuery] = useState(state.query || {});
  const [current, setCurrent] = useState({ component: component, props: state.props });

  const update = useCallback(({ component, state }) => {
    setCurrent({ component: component, props: state.props });
    setQuery(state.query);
    setLocation(state.location);
    setSession(state.session);
    setShared((prev) => ({ ...prev, ...state.shared }));
  }, []);

  useEffect(() => {
    router.init({ state, finder, update });
  }, []);

  const parsed = location.replace(/[^a-z0-9]/ig, '-');
  const key = `visitor-page-${parsed}`;
  const layout = current.component.layout;
  const page = createElement(current.component, { key, ...current.props });

  return (
    <VisitorContext.Provider value={{ session, shared, location, query }}>
      {layout ? createElement(layout, shared, page) : page}
    </VisitorContext.Provider>
  );
}
