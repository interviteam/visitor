import { ComponentType } from 'react';
import { Request, Method, Body } from './request';
import { State, Session, Meta, Response } from './response';

export type { State };

export type ComponentWithLayout = ComponentType & {
  layout?: any;
}

export type ComponentState = State & {
  component: ComponentWithLayout;
};

export type Finder = (view: string) => Promise<ComponentType>;
export type UpdateHandler = (state: ComponentState) => void;

type Init = {
  state: State;
  finder: Finder;
  update: UpdateHandler;
}

type Options = {
  method: Method;
  url: string;
  body?: Body;
  replace?: boolean;
}

class Visitor {
  protected finder!: Finder;
  protected onUpdate!: UpdateHandler;

  protected location!: string;
  protected state!: State;
  protected request: Request | undefined;

  public init({ state, finder, update }: Init): void {
    this.finder = finder;
    this.onUpdate = update;

    this.initializeFirstVisit(state);
    this.initializeStateEvents();
  };

  protected initializeStateEvents() {
    window.addEventListener('popstate', this.handlePopstateEvent.bind(this));
  }

  protected initializeFirstVisit(state: State) {
    this.replaceHistoryState(state);
  }

  protected fireEvent(name: string, options = {}) {
    return document.dispatchEvent(new CustomEvent(`visitor:${name}`, options));
  }

  public dispatch({ method, url, body = null, replace = false }: Options): Promise<State> {
    if (this.request !== undefined) {
      this.request.abort();
    }

    this.fireEvent('start');
    this.request = new Request(method, url, body);

    return this.request.send()
      .then((res) => {
        if (res.partial) {
          return this.handlePartialResponse(res);
        }

        return this.updateComponent(this.mergeState(res.data), replace);
      })
      .catch((error) => {
        console.error(error);

        this.fireEvent('error');

        return Promise.reject(error);
      })
      .finally(() => {
        this.fireEvent('done');
      });
  }

  protected handlePartialResponse(res: Response) {
    // First we want to merge state within visitor to apply any partial
    // changes to the state props/shared parts.
    this.mergeState(res.data, true);

    // Now once state is merged, we can call redirect when provided.
    // Otherwise, we can simply update the component with fresh state.
    if (res.redirect) {
      return this.dispatch({ method: 'GET', url: res.redirect, replace: false });
    }

    return this.updateComponent(this.state, true);
  }

  protected mergeState(fresh: State, merge: boolean = false): State {
    this.state = {
      view: this.state.view,
      query: fresh.query,
      session: fresh.session,
      location: fresh.location,
      shared: { ...this.state.shared, ...fresh.shared },
      props: merge ? { ...this.state.props, ...fresh.props } : fresh.props,
      version: fresh.version,
    };

    return this.state;
  }

  public refresh(): Promise<State> {
    return this.dispatch({
      method: 'GET',
      url: this.location,
      replace: true,
    });
  }

  protected pushHistoryState(state: State) {
    this.state = state;

    window.history.pushState(state, '', state.location);

    return state;
  }

  protected replaceHistoryState(state: State) {
    this.state = state;

    window.history.replaceState(state, '', state.location);

    return state;
  }

  protected handlePopstateEvent(event: PopStateEvent) {
    if (event.state !== null) {
      this.updateComponent(event.state);
    } else {
      this.replaceHistoryState(this.state);
    }
  }

  protected updateComponent(state: State, replace: boolean = false) {
    return this.finder(state.view).then((component) => {
      this.resetScrollPosition();
      this.updateHead(state.props.meta);

      if (replace) {
        this.replaceHistoryState(state);
      } else {
        this.pushHistoryState(state);
      }

      this.onUpdate.call(this, { component, ...state });

      return state;
    });
  }

  protected resetScrollPosition() {
    window.scrollTo(0, 0);
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


/**
 * We do not want to export visitor instance from the module.
 * It should not expose its internals outside to avoid unintended usage.
 */

const visitor = new Visitor();


/**
 * Below we have a public API methods exposed outside the module.
 */

export const defaultSession: Session = {
  is_authenticated: false,
  user: null,
  via_remember: false,
  flash: {},
};

export const $get = (url: string) => {
  return visitor.dispatch({ method: 'GET', url });
};

export const $post = (url: string, body?: Body) => {
  return visitor.dispatch({ method: 'POST', url, body });
};

export const $patch = (url: string, body?: Body) => {
  return visitor.dispatch({ method: 'PATCH', url, body });
};

export const $put = (url: string, body?: Body) => {
  return visitor.dispatch({ method: 'PUT', url, body });
};

export const $delete = (url: string) => {
  return visitor.dispatch({ method: 'DELETE', url });
};

export const $refresh = () => {
  visitor.refresh();
};

export const $redirect = (url: string) => {
  visitor.dispatch({ method: 'GET', url });
};

export const $init = (init: Init) => {
  visitor.init(init);
};
