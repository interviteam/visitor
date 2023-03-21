export type Meta = {
  type: 'title',
  content: string;
} | {
  type: 'meta',
  name: string;
  content: string;
} | {
  type: 'snippet',
  content: string;
};

export type Session = {
  is_authenticated: boolean;
  user: any;
  via_remember: boolean;
  flash: Record<string, any>;
};

export type State = {
  // Request query parameters processed from backend.
  query: Record<string, any>;
  // Session state from server.
  session: Session;
  // Location returned by backend.
  location: string;
  // Path to view component for given page.
  view: string;
  // Shared props updates.
  shared: Record<string, any> | undefined;
  // Props passed to component once it's resolved.
  props: Record<string, any> & { meta?: Meta[] };
  // Page assets version.
  version: string;
}

export class Request {
  protected url: string;
  protected xhr: XMLHttpRequest;

  constructor(url: string) {
    this.url = url;
    this.xhr = new XMLHttpRequest();
  }

  public abort(): void {
    this.xhr.abort();
  }

  public send(): Promise<State> {
    return new Promise((resolve, reject) => {
      this.xhr.responseType = 'json';

      this.xhr.open('GET', this.url, true);

      this.xhr.setRequestHeader('Accept', 'text/html, application/xhtml+xml');
      this.xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
      this.xhr.setRequestHeader('X-Visitor', 'true');

      this.xhr.onload = () => {
        if (this.xhr.readyState !== XMLHttpRequest.DONE || !this.xhr.status) {
          return;
        }

        if (this.isVisitResponse()) {
          resolve(this.xhr.response as State);
        }

        if (this.isClientError() || this.isServerError()) {
          reject({ status: this.xhr.status, message: this.xhr.statusText });
        }
      };

      this.xhr.onerror = () => {
        reject({ status: this.xhr.status, message: this.xhr.statusText });
      };

      this.xhr.send();
    });
  }

  protected isVisitResponse(): boolean {
    return this.isSuccess() && this.hasVisitHeader();
  }

  protected hasVisitHeader(): boolean {
    return !!this.xhr.getResponseHeader('x-visitor');
  }

  protected isSuccess(): boolean {
    return this.xhr.status >= 200 && this.xhr.status < 300;
  }

  protected isClientError(): boolean {
    return this.xhr.status >= 400 && this.xhr.status < 500;
  }

  protected isServerError(): boolean {
    return this.xhr.status >= 500 && this.xhr.status < 600;
  }
}
