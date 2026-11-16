import { z } from "zod";
import { contactSchema } from "./registration";

const fields = {
  name: z.string().trim().min(1, "Informe o nome.").max(120, "Use até 120 caracteres."),
  email: z.string().trim().min(1, "Informe o e-mail de acesso.").email("Informe um e-mail válido.").max(255).transform(v => v.toLowerCase()),
};
export const sellerFormSchema = z.object({ ...fields, contact: contactSchema });
export const sellerSaveSchema = z.object({
  ...fields,
  id: z.string().uuid().nullish().or(z.literal("")),
  phone: z.string().trim().max(20).nullish(),
  contact: contactSchema.optional(),
  active: z.boolean().optional(),
}).superRefine((value, ctx) => {
  if (!value.id && !value.contact) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["contact"], message: "Complete o cadastro do vendedor." });
});
export function sellerFieldErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (!errors[key]) errors[key] = issue.message;
  }
  return errors;
}