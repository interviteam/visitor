import { FunctionComponent, useState, useCallback, useEffect, createElement } from 'react';
import { Finder, Visit, router, defaultSession, Session } from '@interactivevision/visitor';
import { LocationContext } from './location';
import { SessionContext } from './session';
import { SharedContext } from './shared';

export type RouterProps = {
  finder: Finder;
  component: any;
  location: string;
  session: Session;
  visit: Visit;
};

export const Router: FunctionComponent<RouterProps> = ({ finder, component, session, location, visit }) => {
  const [_session, setSession] = useState(defaultSession);
  const [_shared, setShared] = useState(visit.shared || {});
  const [_location, setLocation] = useState(location);

  const [current, setCurrent] = useState({ component: component, props: visit.props });

  const onLocationUpdate = useCallback((location) => setLocation(location), []);
  const onComponentUpdate = useCallback((component) => setCurrent(component), []);
  const onSharedUpdate = useCallback((shared) => setShared((prev) => ({ ...prev, ...shared })), []);
  const onSessionUpdate = useCallback((session) => setSession(() => session), []);

  useEffect(() => {
    router.init({
      visit,
      location,
      session,
      finder,
      onLocationUpdate,
      onComponentUpdate,
      onSharedUpdate,
      onSessionUpdate,
    });
  }, []);

  function wrapWithContext(children) {
    return (
      <SessionContext.Provider value={_session}>
        <SharedContext.Provider value={_shared}>
          <LocationContext.Provider value={_location}>
            {children}
          </LocationContext.Provider>
        </SharedContext.Provider>
      </SessionContext.Provider>
    );
  }

  function wrapWithLayout(layout, children) {
    return createElement(layout, _shared, children);
  }

  function createPage() {
    return createElement(current.component, { key: location, ...current.props });
  }

  if (current.component.layout) {
    return wrapWithContext(wrapWithLayout(current.component.layout, createPage()));
  }

  return wrapWithContext(createPage());
};
