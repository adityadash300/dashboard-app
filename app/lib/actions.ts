'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { Client } from 'pg';

const client = new Client(process.env.POSTGRES_URL);
await client.connect();

export type State = {
    errors?: {
        customerId?: string[];
        amount?: string[];
        status?: string[];
    };
    message?: string | null;
};

const FormSchema = z.object({
    id: z.string(),
    customerId: z.string({ invalid_type_error: 'Please select a customer.' }),
    amount: z.coerce.number().gt(0, { message: 'Please enter an amount greater than $0.' }),
    status: z.enum(['pending', 'paid'], { invalid_type_error: 'Please select a status.' }),
    date: z.string(),
});

const CreateInvoice = FormSchema.omit({ id: true, date: true })

export async function createInvoice(prevState: State, formData: FormData) {
    const rawFormData = Object.fromEntries(formData.entries())

    const validatedFields = CreateInvoice.safeParse(rawFormData)

    if(!validatedFields.success) {
        return {
            errors: validatedFields.error.flatten().fieldErrors,
            message: 'Missing fields. Failed to create Invoice.'
        }
    }

    const {customerId, amount, status} = validatedFields.data
    const amountInCents = amount * 100
    const date = new Date().toISOString().split('T')[0]

    try {
        await client.query(`
          INSERT INTO invoices (customer_id, amount, status, date)
          VALUES ($1, $2, $3, $4)
        `, [customerId, amountInCents, status, date]);
    } catch (err) {
        return {
            message: 'Database Error: Failed to create invoice',
            error: err
        }
    }

    revalidatePath('/dashboard/invoices')
    redirect('/dashboard/invoices')
}

const UpdateInvoice = FormSchema.omit({ id: true, date: true })

export async function updateInvoice(id: string, formData: FormData) {
    const { customerId, amount, status } = UpdateInvoice.parse({
        customerId: formData.get('customerId'),
        amount: formData.get('amount'),
        status: formData.get('status'),
    });

    const amountInCents = amount * 100;

    try {
        await client.query(`
          UPDATE invoices
          SET customer_id = $1, amount = $2, status = $3
          WHERE id = $4]
          `, [customerId, amountInCents, status, id])
    } catch (err) {
        return {
            message: 'Database Error: Failed to update invoice',
            error: err
        }
    }

    revalidatePath('/dashboard/invoices')
    redirect('/dashboard/invoices')
}

export async function deleteInvoice(id: string) {
    // throw new Error('Stimulated Error')
    try {
        await client.query(`
          DELETE FROM invoices WHERE id = $1  
        `, [id])
    } catch (err) {
        return {
            message: 'Database Error: Failed to delete invoice',
            error: err
        }
    }

    revalidatePath('/dashboard/invoices')
}