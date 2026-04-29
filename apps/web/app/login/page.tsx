'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/use-auth';

const schema = z.object({
  identifier: z.string().min(3, 'Ingresa email o usuario'),
  password: z.string().min(8, 'Minimo 8 caracteres'),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    try {
      await login(data);
      toast.success('Bienvenido');
      router.replace('/dashboard');
    } catch {
      toast.error('Credenciales invalidas');
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-snow via-brand-light to-brand-snow p-6">
      <Card className="w-full max-w-md border-brand-light shadow-xl">
        <CardHeader>
          <CardTitle className="text-brand-deep">Acceso a LodeFausti</CardTitle>
          <p className="text-sm text-brand-mid">Ingresa tus credenciales para continuar</p>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-2">
              <Label htmlFor="identifier">Email o usuario</Label>
              <Input
                id="identifier"
                placeholder="admin@lodefausti.local o admin"
                {...register('identifier')}
              />
              {errors.identifier && (
                <p className="text-xs text-red-600">{errors.identifier.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contrasena</Label>
              <Input id="password" type="password" placeholder="********" {...register('password')} />
              {errors.password && <p className="text-xs text-red-600">{errors.password.message}</p>}
            </div>
            <Button
              className="w-full bg-brand-deep hover:bg-brand-mid"
              size="lg"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Ingresando...' : 'Ingresar'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}