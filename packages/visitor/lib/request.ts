import { Response } from './response';

export type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
export type Body = XMLHttpRequestBodyInit | Object | null;

export class Request {
  protected method: Method;
  protected url: string;
  protected xhr: XMLHttpRequest;
  protected body: Body;

  constructor(method: Method, url: string, body: Body = null) {
    this.xhr = new XMLHttpRequest();
    this.method = method;
    this.url = url;
    this.body = body;
  }

  public abort(): void {
    this.xhr.abort();
  }

  public send(): Promise<Response> {
    return new Promise((resolve, reject) => {
      this.xhr.responseType = 'json';

      this.xhr.open(this.method, this.url, true);

      this.xhr.setRequestHeader('Accept', 'application/json');
      this.xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
      this.xhr.setRequestHeader('X-Visitor', 'true');
      this.xhr.setRequestHeader('X-XSRF-TOKEN', this.readCookie('XSRF-TOKEN'));

      this.xhr.onload = () => {
        if (this.xhr.readyState !== XMLHttpRequest.DONE || !this.xhr.status) {
          return;
        }

        const response = new Response(this.xhr);

        if (response.visitor) {
          resolve(response);
          return;
        }

        reject(response);
      };

      this.xhr.onerror = () => {
        reject(new Response(this.xhr));
      };

      this.xhr.send(this.transform(this.body));
    });
  }

  protected transform(body) {
    if (body instanceof Blob || body instanceof ArrayBuffer || body instanceof FormData || body instanceof URLSearchParams) {
      return body;
    }

    if (typeof body === 'string') {
      return body;
    }

    this.xhr.setRequestHeader('Content-Type', 'application/json;charset=UTF-8');

    return JSON.stringify(body);
  }

  protected readCookie(name): string {
    const match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'));

    return (match ? decodeURIComponent(match[3]) : '');
  }
}
