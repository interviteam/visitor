import { ComponentType } from 'react';
import type { renderToString } from 'react-dom/server';
import { Finder, State } from '@interactivevision/visitor';
import { RouterProps, Router } from './router';

type SetupOptions = {
  router: ComponentType<RouterProps>;
  props: RouterProps;
}

type CreateOptions = {
  initial?: State | undefined;
  render?: typeof renderToString;
  resolve: (name: string) => Promise<any>;
  setup: (options: SetupOptions) => any;
}

export async function createVisitor({ initial, resolve, render, setup }: CreateOptions) {
  const isServer = typeof window === 'undefined';
  const { globals, ...state } = initial || readInitials();

  if (!state || !globals) {
    throw new Error('No initial page data was found! Make sure you have used required directives within your Blade root view.');
  }

  Object.keys(globals).forEach((key) => {
    globalThis[key] = globals[key];
  });

  const finder: Finder = (view) => {
    return Promise.resolve(resolve(view)).then((module) => {
      return module.default || module;
    });
  };

  const app = await finder(state.view).then((component) => {
    return setup({ router: Router, props: { finder, component, ...state } });
  });

  if (!isServer) {
    return '';
  }

  if (render) {
    return render(app);
  }

  throw new Error('You must provide "render" function in in SSR context! Use "renderToString" function from "react-dom/server" package.');
}

function readInitials() {
  return JSON.parse(document.getElementById('__VISITOR__')?.textContent || '');
}
