import {
  Alert,
  Button,
  Container,
  PasswordInput,
  Stack,
  TextInput,
  Title,
} from '@mantine/core';
import { type FormEvent, useCallback, useState } from 'react';
import { supabaseClient } from '@/core/supabase';
import { useSession } from './authSelectors';

export interface ILoginPageProps {}

export function LoginPage(props: ILoginPageProps) {
  const session = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setError(null);
      setLoading(true);
      try {
        const { error: authError } =
          await supabaseClient.auth.signInWithPassword({
            email,
            password,
          });
        if (authError) {
          setError(authError.message);
        }
      } catch (err: any) {
        setError(err?.message ?? 'Unknown error');
      } finally {
        setLoading(false);
      }
    },
    [email, password],
  );

  if (!session) {
    return (
      <Container size="xs" mt="xl">
        <Title order={3} mb="lg">
          Sign in
        </Title>
        <form onSubmit={handleSubmit}>
          <Stack gap="sm">
            <TextInput
              label="Email"
              placeholder="your@email.com"
              value={email}
              onChange={e => setEmail(e.currentTarget.value)}
              required
              autoFocus
            />
            <PasswordInput
              label="Password"
              placeholder="Your password"
              value={password}
              onChange={e => setPassword(e.currentTarget.value)}
              required
            />
            {error && (
              <Alert color="red" variant="light">
                {error}
              </Alert>
            )}
            <Button type="submit" loading={loading} fullWidth>
              Log in
            </Button>
          </Stack>
        </form>
      </Container>
    );
  } else {
    return (
      <Container size="xs" mt="xl">
        <Stack>
          <Title order={3}>Logged in!</Title>
          <Button
            onClick={async () => {
              await supabaseClient.auth.signOut();
            }}
          >
            Logout
          </Button>
        </Stack>
      </Container>
    );
  }
}
