'use client';

// src/features/auth/components/login-form.tsx
import * as React from 'react';
import { useForm } from 'react-hook-form';
import Link from 'next/link';
import Image from 'next/image';
import { Loader2, Mail, Lock, ShieldCheck, Users, LayoutGrid, Eye, EyeOff, AlertTriangle, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useLogin } from '../hooks/useLogin';
import {
  LoginSchema,
  zodResolverCompat,
  type LoginFormValues,
} from '@/shared/validators/auth.validator';
import { ROUTES } from '@/core/constants/routes';

/**
 * Login surface — Operate mode.
 * Right pane is intentionally a still life: the BoardVerse house/board mark
 * from `public/Board-game.png` on a warm-neutral field, with three quiet
 * capability tags so the visitor knows which role this portal serves.
 */
const REMEMBER_TILL_KEY = 'boardverse.rememberTill';

function readRememberedTill(): string {
  if (typeof window === 'undefined') return '';
  try {
    return window.localStorage.getItem(REMEMBER_TILL_KEY) ?? '';
  } catch {
    return '';
  }
}

export function LoginForm({ className, ...props }: React.ComponentProps<'div'>) {
  const { mutate: login, isPending, error: serverError } = useLogin();

  const {
    register,
    handleSubmit,
    setFocus,
    reset,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolverCompat(LoginSchema),
    // 'onSubmit' silences per-keystroke revalidation chatter that would
    // otherwise produce overlapping screen-reader announcements alongside
    // the server-level role='alert' banner.
    mode: 'onSubmit',
    defaultValues: {
      usernameOrEmail: readRememberedTill(),
      password: '',
    },
  });

  const [showPassword, setShowPassword] = React.useState(false);
  const [rememberTill, setRememberTill] = React.useState(false);
  const [capsLockOn, setCapsLockOn] = React.useState(false);

  const onSubmit = (values: LoginFormValues) => {
    if (rememberTill && values.usernameOrEmail) {
      try {
        window.localStorage.setItem(REMEMBER_TILL_KEY, values.usernameOrEmail);
      } catch {
        // Storage unavailable (private mode, quota); fall through silently.
      }
    } else {
      try {
        window.localStorage.removeItem(REMEMBER_TILL_KEY);
      } catch {
        // Same silent fallback.
      }
    }
    login(values, {
      onError: () => {
        // Return focus and selection to the username field so a screen-reader
        // user lands where the next action begins and a sighted user can
        // immediately retype. Password field is intentionally untouched so
        // partial typing isn't lost.
        setFocus('usernameOrEmail');
        const el = document.getElementById('usernameOrEmail') as
          | HTMLInputElement
          | null;
        el?.select?.();
      },
    });
  };

  // Bring the cursor to the first field on mount so staff at the till
  // can start typing immediately.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  React.useEffect(() => {
    setFocus('usernameOrEmail');
  }, []);

  // Track Caps Lock state via the password input itself so on-screen
  // keyboards (common on cafe POS hardware) are detected, and so the
  // hint survives brief focus excursions (e.g. tabbing to the eye toggle).
  // We only commit a state change when we've observed a recent real key
  // press — pasting into the field should not flip the indicator.
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const passwordEl = document.getElementById('password') as HTMLInputElement | null;
    if (!passwordEl) return;

    const RECENT_OBSERVATION_MS = 1500;
    let lastObservedAt = 0;

    const syncState = (e: KeyboardEvent) => {
      if (!('getModifierState' in e)) return;
      lastObservedAt = e.timeStamp;
      setCapsLockOn(e.getModifierState('CapsLock'));
    };
    const commitOnFocus = () => {
      // Hide the hint when focus leaves the password area unless we
      // observed a Caps Lock keypress in the last RECENT_OBSERVATION_MS.
      if (performance.now() - lastObservedAt > RECENT_OBSERVATION_MS) {
        setCapsLockOn(false);
      }
    };

    passwordEl.addEventListener('keydown', syncState);
    passwordEl.addEventListener('keyup', syncState);
    passwordEl.addEventListener('focusout', commitOnFocus);
    return () => {
      passwordEl.removeEventListener('keydown', syncState);
      passwordEl.removeEventListener('keyup', syncState);
      passwordEl.removeEventListener('focusout', commitOnFocus);
    };
  }, []);

  // If the username came back from storage, pre-check the toggle AND push
  // the value into the form so the input never lies about the persisted
  // identity — HMR or a route-back to /login can otherwise leave the
  // checkbox 'on' with an empty username field, letting the next submit
  // overwrite the stored identity with an empty string.
  React.useEffect(() => {
    const remembered = readRememberedTill();
    if (remembered) {
      setRememberTill(true);
      reset({ usernameOrEmail: remembered, password: '' });
    }
    // reset() is a stable ref from useForm; safe to depend on.
  }, [reset]);

  return (
    <div className={cn('flex flex-col gap-5', className)} {...props}>
      <Card className="overflow-hidden p-0 border-transparent shadow-[0_1px_2px_rgba(15,15,15,0.04),0_24px_60px_-24px_rgba(15,15,15,0.18)] rounded-2xl">
        <CardContent className="grid p-0 md:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
                    {/* ─── Form Panel ─────────────────────────────── */}
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="p-7 md:p-10 flex flex-col gap-6 bg-card"
            noValidate
          >
            {/* Header — heading carries its own weight, no eyebrow above */}
            <div className="flex flex-col gap-1.5">
              <h1 className="text-[1.7rem] leading-[1.2] font-semibold tracking-[-0.02em] text-foreground">
                Chào mừng trở lại.
              </h1>
              <p className="text-sm text-neutral-600 leading-relaxed">
                Đăng nhập để vào bảng điều khiển quản trị của quán.
              </p>
            </div>

            {/* Server-level error (e.g. 401, blocked, too many tries).
                Assertive so a screen reader announces it immediately;
                the form-level error code is the only one that benefits
                from interrupting in-progress speech. */}
            {serverError && (
              <div
                role="alert"
                aria-live="assertive"
                className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3.5 py-2.5 text-xs text-destructive leading-relaxed"
              >
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                <span>{(serverError as Error).message}</span>
              </div>
            )}

            {/* Username / Email */}
            <div className="flex flex-col gap-2">
              <Label
                htmlFor="usernameOrEmail"
                className="text-xs font-medium text-foreground/80"
              >
                Tên đăng nhập hoặc email
              </Label>
              <div className="relative">
                <Mail
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500 pointer-events-none"
                  aria-hidden
                />
                <Input
                  id="usernameOrEmail"
                  type="text"
                  placeholder="admin@boardverse.com"
                  className="pl-9 h-11 rounded-lg bg-background border-border/80 focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-0 focus-visible:border-neutral-900"
                  autoComplete="username"
                  aria-invalid={!!errors.usernameOrEmail}
                  aria-describedby={errors.usernameOrEmail ? 'login-username-error' : undefined}
                  {...register('usernameOrEmail')}
                />
              </div>
              {errors.usernameOrEmail && (
                <p
                  id="login-username-error"
                  className="text-xs text-destructive leading-snug"
                >
                  {errors.usernameOrEmail.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between">
                <Label
                  htmlFor="password"
                  className="text-xs font-medium text-foreground/80"
                >
                  Mật khẩu
                </Label>
                <Link
                  href={ROUTES.AUTH.FORGOT_PASSWORD}
                  className="text-[11px] font-medium text-neutral-600 hover:text-foreground underline underline-offset-4 hover:no-underline transition-colors"
                >
                  Quên mật khẩu?
                </Link>
              </div>
              <div className="relative">
                <Lock
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500 pointer-events-none"
                  aria-hidden
                />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="pl-9 pr-12 h-11 rounded-lg bg-background border-border/80 focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-0 focus-visible:border-neutral-900"
                  autoComplete="current-password"
                  aria-invalid={!!errors.password}
                  aria-describedby={[
                    capsLockOn ? 'login-capslock-hint' : null,
                    errors.password ? 'login-password-error' : null,
                  ]
                    .filter(Boolean)
                    .join(' ') || undefined}
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  aria-pressed={showPassword}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 inline-flex h-9 w-9 min-h-[44px] min-w-[44px] items-center justify-center rounded-md text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 focus-visible:ring-offset-card transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" aria-hidden />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden />
                  )}
                </button>
              </div>
              {capsLockOn && (
                <p
                  id="login-capslock-hint"
                  className="flex items-center gap-1.5 text-[11px] text-amber-700 leading-snug"
                >
                  <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden />
                  Phím Caps Lock đang bật — tắt trước khi nhập mật khẩu.
                </p>
              )}
              {errors.password && (
                <p id="login-password-error" className="text-xs text-destructive leading-snug">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Remember this till — pre-fills the username on this device
                for the next shift. Username only, never the password. */}
            <label className="flex items-center gap-2 text-xs text-neutral-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberTill}
                onChange={(e) => setRememberTill(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-border accent-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 focus-visible:ring-offset-card"
              />
              Ghi nhớ ca trực này trên thiết bị
            </label>

            {/* Submit */}
            <Button
              type="submit"
              className="w-full h-11 mt-1 rounded-lg bg-neutral-900 text-white hover:bg-neutral-800 active:bg-neutral-950 disabled:bg-neutral-300 disabled:text-neutral-500 font-semibold text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900"
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                  Đang đăng nhập…
                </>
              ) : (
                'Đăng nhập'
              )}
            </Button>

            {/* Separator + secondary CTA — dành cho chủ quán chưa có tài khoản.
                Phân tách thị giác bằng đường kẻ mờ + dòng "Hoặc" ở giữa để
                không cạnh tranh attention với nút Submit chính. */}
            <div
              role="separator"
              aria-orientation="horizontal"
              className="relative my-1 h-px bg-neutral-200"
            >
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-[11px] font-medium text-neutral-500 uppercase tracking-wider">
                Hoặc
              </span>
            </div>

            <Link
              href={ROUTES.PARTNER.REGISTER}
              className="inline-flex items-center justify-center gap-2 w-full h-11 rounded-lg border border-neutral-900/15 bg-white text-neutral-900 hover:bg-neutral-50 hover:border-neutral-900/30 active:bg-neutral-100 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 focus-visible:ring-offset-card"
            >
              <Store className="h-4 w-4" aria-hidden />
              Trở thành đối tác cafe
            </Link>

          </form>

          {/* ─── Decorative Panel — Board game still life ─── */}
          <aside
            aria-label="Giới thiệu BoardVerse"
            className="relative hidden md:flex flex-col bg-[#F4EFE8] p-8 lg:p-10 overflow-hidden"
          >
            {/* Soft tonal frame: a barely-there inner border, no halo */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-3 rounded-xl border border-neutral-900/[0.06]"
            />

            {/* Top status row — useful info, not a kicker */}
            <div className="relative flex items-center justify-between text-[11px] font-semibold tracking-[0.16em] uppercase text-neutral-700">
              <span>BoardVerse Portal</span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/70 backdrop-blur-[2px] border border-neutral-900/10 px-2.5 py-1 text-neutral-700">
                <span
                  aria-hidden
                  className="h-1.5 w-1.5 rounded-full bg-emerald-500"
                />
                Trực tuyến
              </span>
            </div>

            {/* Center — framed image + caption */}
            <div className="relative flex flex-1 flex-col items-center justify-center gap-5 text-center py-8">
              <figure className="relative rounded-2xl overflow-hidden bg-[#E8DFCF] shadow-[0_18px_36px_-20px_rgba(15,15,15,0.35)]">
                <Image
                  src="/Board-game.png"
                  alt="Minh họa một ván board game trên bàn gỗ"
                  width={480}
                  height={480}
                  priority
                  sizes="(min-width: 1024px) 360px, 70vw"
                  className="h-auto w-[260px] sm:w-[300px] lg:w-[340px] max-w-full select-none"
                />
                <figcaption className="sr-only">
                  BoardVerse — nền tảng vận hành cho quán board game.
                </figcaption>
              </figure>

              <div className="space-y-1.5 max-w-[34ch]">
                {/* Decorative kicker inside an aria-labelled <aside>, so it
                    is a <p>, not an <h2>. Keeps the document outline to the
                    one real <h1> in the left column. */}
                <p className="text-[1.35rem] leading-[1.25] font-semibold tracking-[-0.015em] text-neutral-900">
                  Vận hành ca trực, không rời màn hình.
                </p>
                <p className="text-sm text-neutral-700/80 leading-relaxed">
                  POS, giải đấu và đối soát — tất cả trong cùng một bảng điều khiển.
                </p>
              </div>
            </div>

            {/* Bottom — role chips (no kicker, no numbered list) */}
            <ul className="relative grid grid-cols-3 gap-2 text-[11px] font-medium text-neutral-800">
              <li className="flex items-center justify-center gap-1.5 rounded-lg bg-white/70 border border-neutral-900/[0.06] py-2 px-2 backdrop-blur-[2px]">
                <ShieldCheck className="h-3.5 w-3.5 text-neutral-700" aria-hidden />
                Admin
              </li>
              <li className="flex items-center justify-center gap-1.5 rounded-lg bg-white/70 border border-neutral-900/[0.06] py-2 px-2 backdrop-blur-[2px]">
                <Users className="h-3.5 w-3.5 text-neutral-700" aria-hidden />
                Manager
              </li>
              <li className="flex items-center justify-center gap-1.5 rounded-lg bg-white/70 border border-neutral-900/[0.06] py-2 px-2 backdrop-blur-[2px]">
                <LayoutGrid className="h-3.5 w-3.5 text-neutral-700" aria-hidden />
                Staff
              </li>
            </ul>
          </aside>
        </CardContent>
      </Card>
    </div>
  );
}