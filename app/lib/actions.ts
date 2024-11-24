'use server';

import { z } from 'zod';
import { insertInvoice } from './data';
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