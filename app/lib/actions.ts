'use server';

import { z } from 'zod';
import { insertInvoice, removeInvoice, updateInvoiceInDb } from './data';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

const FormSchema = z.object({
    id: z.string(),
    customerId: z.string(),
    amount: z.coerce.number(),
    status: z.enum(['pending', 'paid']),
    date: z.string(),
});

const CreateInvoice = FormSchema.omit({ id: true, date: true })

export async function createInvoice(formData: FormData) {
    const rawFormData = Object.fromEntries(formData.entries())

    const { customerId, amount, status } = CreateInvoice.parse(rawFormData)

    const amountInCents = amount * 100
    const date = new Date().toISOString().split('T')[0]

    await insertInvoice({ customerId, amountInCents, status, date });

    revalidatePath('/dashboard/invoice')
    redirect('/dashboard/invoice')
}

const UpdateInvoice = FormSchema.omit({ id: true, date: true })

export async function updateInvoice(id: string, formData: FormData) {
    const { customerId, amount, status } = UpdateInvoice.parse({
        customerId: formData.get('customerId'),
        amount: formData.get('amount'),
        status: formData.get('status'),
    });

    const amountInCents = amount * 100;

    await updateInvoiceInDb({ customerId, amountInCents, status }, id)

    revalidatePath('/dashboard/invoice')
    redirect('/dashboard/invoice')
}

export async function deleteInvoice(id:string) {
    await removeInvoice(id)

    revalidatePath('/dashboard/invoice')
}