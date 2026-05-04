<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Illuminate\Support\Facades\Auth;

class AdminOnly
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = Auth::user();

        // not logged in -> go login
        if (!$user) {
            return redirect()->route('login');
        }

        // only real admins allowed here
        if ($user->is_admin) {
            return $next($request);
        }

        abort(403, 'Unauthorized access');
    }
}
