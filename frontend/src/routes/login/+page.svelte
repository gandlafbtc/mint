<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import FormButton from '$lib/components/ui/form/form-button.svelte';
	import { toast } from 'svelte-sonner';
	import { bytesToHex } from '@noble/hashes/utils';
	import { scrypt } from '@noble/hashes/scrypt';
	import { PUBLIC_MINT_API } from '$env/static/public';
	import { ensureError } from '../../errors';
	import { userLoggedIn } from '../../stores';
	import { goto } from '$app/navigation';


    let username = $state('')
    let password = $state('')
    let isLoading = $state(false);

    const login = async () => {
		try {
			const pwHash = bytesToHex(
				scrypt(password, 'saltynuts', { N: 2 ** 16, r: 8, p: 1, dkLen: 32 })
			);
			isLoading = true;
			let response = await fetch(`${PUBLIC_MINT_API}/admin/login`, {
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
    }
</script>
<div class="w-full h-screen items-center justify-center flex">

    <Card.Root class='w-80'>
        <form onsubmit={login}>

            <Card.Header>
                <Card.Title>Login</Card.Title>
                <Card.Description>
                    Enter your login information.
                </Card.Description>
            </Card.Header>
            <Card.Content class="space-y-2">
                <div class="space-y-1">
                    <Label for="user">Username</Label>
                    <Input bind:value={username} required placeholder="jinpang" />
                </div>
                <div class="space-y-1">
                    <Label for="pass">Password</Label>
                    <Input bind:value={password} required type='password' placeholder='*********'/>
                </div>
            </Card.Content>
            <Card.Footer class='flex gap-2 justify-between items-center'>
                <a href="/signup" class="text-sm underline">
                    Sign up
                </a>
                <FormButton>Login</FormButton>
            </Card.Footer>
        </form>
    </Card.Root>
    
</div>