import { ComponentType } from 'react';
import { Request, VisitorResponse } from './request';

export type Visit = {
  // Path to view component for given page.
  view: string;
  // Shared props updates.
  shared: Record<string, any> | undefined;
  // Props passed to component once it's resolved.
  props: Record<string, any>;
  // Page assets version.
  version: string;
};

export type HistoryState = {
  location: string;
  visit: Visit;
};

export type Session = {
  is_authenticated: boolean;
  user: any;
  via_remember: boolean;
};

export type ComponentState<TProps extends Record<string, any> = {}> = {
  component: any;
  props: TProps;
};

export type Finder = (view: string) => Promise<ComponentType>;
export type SharedHandler = (shared: any) => void;
export type LocationHandler = (location: string) => void;
export type ComponentHandler = (state: ComponentState) => void;
export type SessionHandler = (session: Session) => void;

export const defaultSession: Session = {
  is_authenticated: false,
  user: null,
  via_remember: false,
};

type RouterOptions = {
  session: Session;
  location: string;
  visit: Visit;
  finder: Finder;
  onLocationUpdate: LocationHandler;
  onComponentUpdate: ComponentHandler;
  onSharedUpdate: SharedHandler;
  onSessionUpdate: SessionHandler;
}

export class Visitor {

  protected finder!: Finder;
  protected onLocationUpdate!: LocationHandler;
  protected onSharedUpdate!: SharedHandler;
  protected onComponentUpdate!: ComponentHandler;
  protected onSessionUpdate!: SessionHandler;

  protected location!: string;
  protected session!: Session;
  protected visit!: Visit;
  protected request: Request | undefined;

  public init({ session, location, visit, finder, onLocationUpdate, onComponentUpdate, onSharedUpdate, onSessionUpdate }: RouterOptions): void {
    this.finder = finder;
    this.onLocationUpdate = onLocationUpdate;
    this.onComponentUpdate = onComponentUpdate;
    this.onSharedUpdate = onSharedUpdate;
    this.onSessionUpdate = onSessionUpdate;

    this.initializeFirstVisit(visit, location, session);
    this.initializeStateEvents();
  };

  protected initializeStateEvents() {
    window.addEventListener('popstate', this.handlePopstateEvent.bind(this));
  }

  protected initializeFirstVisit(visit: Visit, location: string, session: Session) {
    this.updateSession(session);

    this.replaceState({ visit, location });
  }

  public dispatch(url: string): Promise<VisitorResponse> {
    if (this.request !== undefined) {
      this.request.abort();
    }

    this.request = new Request(url);

    return this.request.send()
      .then((res) => {
        this.updateSession(res.session);
        this.pushState(res);
        this.updateComponent(res.visit);

        return res;
      })
      .catch((error) => {
        console.error(error);

        // TODO: Display errors somehow here. Might be useful to resolve error pages and provide some API.

        return Promise.reject(error);
      });
  }

  protected pushState({ visit, location }: HistoryState) {
    this.visit = visit;

    window.history.pushState({ visit, location }, '', location);
    this.updateLocation(location);

    return visit;
  }

  protected replaceState({ visit, location }: HistoryState) {
    this.visit = visit;

    window.history.replaceState({ location, visit }, '', location);
    this.updateLocation(location);

    return visit;
  }

  protected handlePopstateEvent(event: PopStateEvent) {
    if (event.state !== null) {
      this.updateComponent(event.state);
    } else {
      this.replaceState({ visit: this.visit, location: this.location });
    }
  }

  protected updateSession(session: Session) {
    this.session = session;
    this.onSessionUpdate.call(this, session);
  }

  protected updateLocation(location: string) {
    this.location = location;
    this.onLocationUpdate.call(this, location);
  }

  protected updateComponent(visit: Visit) {
    this.finder(visit.view).then((component) => {
      this.onComponentUpdate.call(this, { component, props: visit.props });
    });
  }
}

export const router = new Visitor();
