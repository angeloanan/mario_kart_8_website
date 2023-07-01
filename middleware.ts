import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { type JWTTokenPayload, getMK8Token, getMK8TokenFromAccountAPI } from './helpers/types/JWTTokenPayload';

export async function middleware(request: NextRequest) {

    if (request.nextUrl.pathname.startsWith('/logout')) {
        const referer: string | null = request.headers.get("referer");
        const url = new URL(referer ? referer : '/', request.url);

        const response = NextResponse.redirect(url);
        response.cookies.set("mk8_token", "", { maxAge: 0, domain: ".pretendo.network" });
        response.cookies.set("access_token", "", { maxAge: 0, domain: ".pretendo.network" });
        response.cookies.set("refresh_token", "", { maxAge: 0, domain: ".pretendo.network" });
        response.cookies.set("token_type", "", { maxAge: 0, domain: ".pretendo.network" });
        return response;
    }

    const hostname = request.nextUrl.hostname;
    const redirect_login_url = `https://${hostname.substring(hostname.indexOf('.') + 1)}/account/login?redirect=http://${hostname}`;

    var mk8_token: JWTTokenPayload | null = await getMK8Token(request);
    let res;
    if (!mk8_token) {
        res = await getMK8TokenFromAccountAPI(request);
        if (!res && request.nextUrl.pathname.startsWith('/admin')) {
            const response = NextResponse.redirect(redirect_login_url);
            if (request.cookies.has("mk8_token")) {
                response.cookies.delete("mk8_token");
            }
            return response;
        }
        if (res) {
            mk8_token = res.token;
        }
    }

    if (request.nextUrl.pathname.startsWith('/admin')) {
        if (mk8_token) {
            if (mk8_token.access_level < 3) {
                var response = NextResponse.redirect(new URL('/', request.url));
            } else {
                var response = NextResponse.next();
            }

            response.headers.set("X-MK8-Pretendo-SAL", mk8_token.server_access_level);
            response.headers.set("X-MK8-Pretendo-Username", mk8_token.pnid);
            response.headers.set("X-MK8-Pretendo-ImageURL", mk8_token.mii_image_url);
            response.headers.set("X-MK8-Pretendo-PID", mk8_token.pid.toString());
            if (res) {
                response.cookies.set("mk8_token", res.jwt_token, { domain: ".pretendo.network" });
            }
            return response;
        } else {
            const response = NextResponse.redirect(redirect_login_url);
            if (request.cookies.has("mk8_token")) {
                response.cookies.delete("mk8_token");
            }
            return response;
        }

    } else {
        const response = NextResponse.next();
        if (mk8_token) {
            response.headers.set("X-MK8-Pretendo-SAL", mk8_token.server_access_level);
            response.headers.set("X-MK8-Pretendo-Username", mk8_token.pnid);
            response.headers.set("X-MK8-Pretendo-ImageURL", mk8_token.mii_image_url);
            response.headers.set("X-MK8-Pretendo-PID", mk8_token.pid.toString());
        }
        if (res) {
            response.cookies.set("mk8_token", res.jwt_token, { domain: ".pretendo.network" });
        }
        return response;
    }
}
export const config = {
    matcher: [
        '/',
        '/logout',
        '/api/:path*',
        '/admin/:path*',
        '/dashboard/:path*',
        '/tournaments/:path*',
        '/gatherings/:path*',
        '/rankings/:path*'
    ]
}