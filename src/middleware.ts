// Guards the member area. /backend/* requires a valid session; otherwise the
// visitor is sent to /login. The signed-in member is stashed on locals for
// pages to render. Prerendered marketing routes never match and pass straight
// through.
import { defineMiddleware } from 'astro:middleware';
import { auth } from './lib/auth';

export const onRequest = defineMiddleware(async (context, next) => {
  if (context.url.pathname.startsWith('/backend')) {
    const session = await auth.api.getSession({ headers: context.request.headers });
    if (!session) {
      return context.redirect('/login');
    }
    context.locals.user = session.user;
  }
  return next();
});
