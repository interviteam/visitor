import { ComponentType } from 'react';
import type { renderToString } from 'react-dom/server';
import { Finder, Visit } from '@interactivevision/visitor';
import { RouterProps, Router } from './router';

type SetupOptions = {
  router: ComponentType<RouterProps>;
  props: RouterProps;
}

type CreateOptions = {
  initial?: Visit | undefined;
  render?: typeof renderToString;
  resolve: (name: string) => Promise<any>;
  setup: (options: SetupOptions) => any;
}

export async function createVisitor({ initial, resolve, render, setup }: CreateOptions) {
  const isServer = typeof window === 'undefined';
  const { session, location, visit } = initial || JSON.parse(document.getElementById('__VISITOR__')?.textContent || '');

  if (!visit) {
    throw new Error('No initial page data was found! Make sure you have used required directives within your Blade root view.');
  }

  const finder: Finder = (view) => Promise.resolve(resolve(view)).then(module => {
    return module.default || module;
  });

  const app = await finder(visit.view).then((component) => {
    return setup({ router: Router, props: { finder, component, session, location, visit } });
  });

  if (!isServer) {
    return '';
  }

  if (render) {
    return render(app);
  }

  throw new Error('You must provide "render" function in in SSR context! Use "renderToString" function from "react-dom/server" package.');
}
