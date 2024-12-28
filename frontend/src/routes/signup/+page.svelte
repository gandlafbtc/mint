<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import FormButton from '$lib/components/ui/form/form-button.svelte';
	import { PUBLIC_MINT_API } from '$env/static/public';
	import { toast } from 'svelte-sonner';
	import { scrypt } from '@noble/hashes/scrypt';
	import { bytesToHex } from '@noble/hashes/utils';
	import { ensureError } from '../../errors';
	import { userLoggedIn } from '../../stores';
	import { goto } from '$app/navigation';

	let username = $state('');
	let password = $state('');
	let passwordRepeat = $state('');

	let isLoading = $state();

	const signup = async () => {
        console.log(password)
		if (password.length < 12) {
			toast.warning('Password must be 12 characters or longer');
			return;
		}
		if (password! !== passwordRepeat) {
			toast.warning('Passwords do not match');
			return;
		}
		try {
			const pwHash = bytesToHex(
				scrypt(password, 'saltynuts', { N: 2 ** 16, r: 8, p: 1, dkLen: 32 })
			);
			isLoading = true;
			const response = await fetch(`${PUBLIC_MINT_API}/admin/signup`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					username,
					password
                    : pwHash
				})
			});
            const data = await response.json()
            if (!data.success) {
                throw new Error(data.message);
            }
            userLoggedIn.set(data.data.user)
            toast.success(data.message)
            goto('/')
		} catch (error) {
            console.error(error)
            const err = ensureError(error)
            toast.error(err.message)
		} finally {
			isLoading = false;
		}
	};
</script>

<div class="flex h-screen w-full items-center justify-center">
	<Card.Root class="w-80">
		<form onsubmit={signup}>
			<Card.Header>
				<Card.Title>Signup</Card.Title>
				<Card.Description>Enter your login information.</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-2">
				<div class="space-y-1">
					<Label for="name">Username</Label>
					<Input bind:value={username} required id="name" placeholder="jinpang" />
				</div>
				<div class="space-y-1">
					<Label for="username">Password</Label>
					<Input bind:value={password} required type="password" placeholder="*********" />
				</div>
				<div class="space-y-1">
					<Label for="username">Repeat password</Label>
					<Input bind:value={passwordRepeat} required type="password" placeholder="*********" />
				</div>
			</Card.Content>
			<Card.Footer class="flex items-center justify-between gap-2">
				<a href="/login" class="text-sm underline"> Login </a>
				<FormButton type="submit">Sign up</FormButton>
			</Card.Footer>
		</form>
	</Card.Root>
</div>
