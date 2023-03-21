import { ComponentType } from 'react';
import { Request, Session, State, Meta } from './request';


export type ComponentState = {
  component: any;
  state: State;
};

export type Finder = (view: string) => Promise<ComponentType>;
export type UpdateHandler = (state: ComponentState) => void;

export const defaultSession: Session = {
  is_authenticated: false,
  user: null,
  via_remember: false,
  flash: {},
};

type RouterOptions = {
  state: State;
  finder: Finder;
  update: UpdateHandler;
}

export class Visitor {
  protected finder!: Finder;
  protected onUpdate!: UpdateHandler;

  protected location!: string;
  protected session!: Session;
  protected state!: State;
  protected request: Request | undefined;

  public init({ state, finder, update }: RouterOptions): void {
    this.finder = finder;
    this.onUpdate = update;

    this.initializeFirstVisit(state);
    this.initializeStateEvents();
  };

  protected initializeStateEvents() {
    window.addEventListener('popstate', this.handlePopstateEvent.bind(this));
  }

  protected initializeFirstVisit(state: State) {
    this.replaceState(state);
  }

  protected fireEvent(name: string, options = {}) {
    return document.dispatchEvent(new CustomEvent(`visitor:${name}`, options));
  }

  public dispatch(url: string, replace: boolean = false): Promise<State> {
    if (this.request !== undefined) {
      this.request.abort();
    }

    this.fireEvent('start');
    this.request = new Request(url);

    return this.request.send()
      .then((res) => {
        this.updateComponent(res, replace);

        return res;
      })
      .catch((error) => {
        console.error(error);

        this.fireEvent('error');

        // TODO: Display errors somehow here. Might be useful to resolve error pages and provide some API.

        return Promise.reject(error);
      })
      .finally(() => {
        this.fireEvent('done');
      });
  }

  public reload(): Promise<State> {
    return this.dispatch(this.location, true);
  }

  protected pushState(state: State) {
    this.state = state;

    window.history.pushState(state, '', state.location);

    return state;
  }

  protected replaceState(state: State) {
    this.state = state;

    window.history.replaceState(state, '', state.location);

    return state;
  }

  protected handlePopstateEvent(event: PopStateEvent) {
    if (event.state !== null) {
      this.updateComponent(event.state);
    } else {
      this.replaceState(this.state);
    }
  }

  protected updateComponent(state: State, replace: boolean = false) {
    this.finder(state.view).then((component) => {
      this.resetScrollPosition();
      this.updateHead(state.props.meta);

      if (replace) {
        this.replaceState(state);
      } else {
        this.pushState(state);
      }

      this.onUpdate.call(this, { component, state });
    });
  }

  protected resetScrollPosition() {
    // @ts-ignore
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }

  protected updateHead(meta?: Meta[]) {
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
