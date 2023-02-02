import { ComponentType } from 'react';
import { Request, VisitorResponse } from './request';

type MetaTitle = {
  type: 'title',
  content: string;
}

type MetaTag = {
  type: 'meta',
  name: string;
  content: string;
}

type MetaSnippet = {
  type: 'snippet',
  content: string;
}

export type MetaData = MetaTitle | MetaTag | MetaSnippet;

export type Visit = {
  // Path to view component for given page.
  view: string;
  // Shared props updates.
  shared: Record<string, any> | undefined;
  // Props passed to component once it's resolved.
  props: Record<string, any> & { meta?: MetaData[] };
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

export class Visitor
{
  protected finder!: Finder;
  protected onLocationUpdate!: LocationHandler;
  protected onSharedUpdate!: SharedHandler;
  protected onComponentUpdate!: ComponentHandler;
  protected onSessionUpdate!: SessionHandler;

  protected location!: string;
  protected session!: Session;
  protected visit!: Visit;
  protected request: Request | undefined;

  public init({ session, location, visit, finder, onLocationUpdate, onComponentUpdate, onSharedUpdate, onSessionUpdate }: RouterOptions): void
  {
    this.finder = finder;
    this.onLocationUpdate = onLocationUpdate;
    this.onComponentUpdate = onComponentUpdate;
    this.onSharedUpdate = onSharedUpdate;
    this.onSessionUpdate = onSessionUpdate;

    this.initializeFirstVisit(visit, location, session);
    this.initializeStateEvents();
  };

  protected initializeStateEvents()
  {
    window.addEventListener('popstate', this.handlePopstateEvent.bind(this));
  }

  protected initializeFirstVisit(visit: Visit, location: string, session: Session)
  {
    this.updateSession(session);

    this.replaceState({ visit, location });
  }

  public dispatch(url: string, replace: boolean = false): Promise<VisitorResponse>
  {
    if (this.request !== undefined) {
      this.request.abort();
    }

    this.request = new Request(url);

    return this.request.send()
      .then((res) => {
        this.updateSession(res.session);

        if (replace) {
          this.replaceState(res);
        } else {
          this.pushState(res);
        }

        this.updateComponent(res.visit);

        return res;
      })
      .catch((error) => {
        console.error(error);

        // TODO: Display errors somehow here. Might be useful to resolve error pages and provide some API.

        return Promise.reject(error);
      });
  }

  public reload(): Promise<VisitorResponse>
  {
    return this.dispatch(this.location, true);
  }

  protected pushState({ visit, location }: HistoryState)
  {
    this.visit = visit;

    window.history.pushState({ visit, location }, '', location);
    this.updateLocation(location);

    return visit;
  }

  protected replaceState({ visit, location }: HistoryState)
  {
    this.visit = visit;

    window.history.replaceState({ location, visit }, '', location);
    this.updateLocation(location);

    return visit;
  }

  protected handlePopstateEvent(event: PopStateEvent)
  {
    if (event.state !== null && event.state.location && event.state.visit) {
      this.updateComponent(event.state.visit);
      this.updateLocation(event.state.location);
    } else {
      this.replaceState({ visit: this.visit, location: this.location });
    }
  }

  protected updateSession(session: Session)
  {
    this.session = session;
    this.onSessionUpdate.call(this, session);
  }

  protected updateLocation(location: string)
  {
    if (this.location === location) {
      return;
    }

    this.location = location;
    this.onLocationUpdate.call(this, location);
  }

  protected updateComponent(visit: Visit)
  {
    this.finder(visit.view).then((component) => {
      this.updateHead(visit.props.meta);
      this.onComponentUpdate.call(this, { component, props: visit.props });
    });
  }

  protected updateHead(meta?: MetaData[])
  {
    // Do not update meta tags until new one arrives.
    // Otherwise, you'll end with page without metadata.
    if (!meta) {
      return;
    }

    document.head.querySelectorAll('[visitor]').forEach((element) => element.remove());

    meta.forEach((tag) => {
      let element: HTMLElement;

      switch (tag.type) {
        case 'title':
          element = document.createElement('title');
          element.innerHTML = tag.content;
          break;

        case 'meta':
          element = document.createElement('meta');
          element.setAttribute('name', tag.name);
          element.setAttribute('content', tag.content);
          break;

        case 'snippet':
          element = document.createElement('script');
          element.setAttribute('type', 'application/ld+json');
          element.innerHTML = tag.content;
          break;
      }

      element.setAttribute('visitor', '');

      document.head.append(element);
    });
  }
}

export const router = new Visitor();
