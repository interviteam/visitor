import { Visit, Session } from './visitor';

export type VisitorResponse = {
  session: Session;
  location: string;
  visit: Visit;
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

  public send(): Promise<VisitorResponse> {
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
          resolve(this.xhr.response as VisitorResponse);
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
