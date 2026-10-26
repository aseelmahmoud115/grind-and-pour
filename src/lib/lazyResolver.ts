import type { FieldValues, Resolver } from "react-hook-form";
import type { ZodType } from "zod";

/**
 * A react-hook-form resolver that fetches zod, its resolver and the schema on the
 * first validation, so none of them ship with the page that shows the form.
 */
export function lazyZodResolver<T extends FieldValues>(loadSchema: () => Promise<ZodType<T, T>>): Resolver<T> {
  let resolver: Promise<Resolver<T>> | undefined;
  return async (values, context, options) => {
    resolver ??= Promise.all([import("@hookform/resolvers/zod"), loadSchema()]).then(
      ([{ zodResolver }, schema]) => zodResolver(schema) as unknown as Resolver<T>,
    );
    return (await resolver)(values, context, options);
  };
}
