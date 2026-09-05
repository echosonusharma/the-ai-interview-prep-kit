import type { Request, Response, NextFunction } from "express";
import type { ZodType } from "zod";

interface ValidateSchemas {
  body?: ZodType;
  query?: ZodType;
  params?: ZodType;
}

/**
 * Validate body/query/params against zod schemas. 400s with { error, details }
 * on failure; replaces each property with parsed data on success.
 */
export function validate(schemas: ValidateSchemas) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const details: Array<{ field: string; message: string }> = [];

    if (schemas.body) {
      const parsed = schemas.body.safeParse(req.body);
      if (!parsed.success) {
        for (const issue of parsed.error.issues) {
          details.push({ field: `body.${issue.path.join(".") || "(root)"}`, message: issue.message });
        }
      } else {
        req.body = parsed.data;
      }
    }

    if (schemas.query) {
      const parsed = schemas.query.safeParse(req.query);
      if (!parsed.success) {
        for (const issue of parsed.error.issues) {
          details.push({ field: `query.${issue.path.join(".") || "(root)"}`, message: issue.message });
        }
      } else {
        Object.defineProperty(req, "query", { value: parsed.data, writable: true, configurable: true });
      }
    }

    if (schemas.params) {
      const parsed = schemas.params.safeParse(req.params);
      if (!parsed.success) {
        for (const issue of parsed.error.issues) {
          details.push({ field: `params.${issue.path.join(".") || "(root)"}`, message: issue.message });
        }
      } else {
        Object.defineProperty(req, "params", { value: parsed.data, writable: true, configurable: true });
      }
    }

    if (details.length > 0) {
      res.status(400).json({ error: details[0]!.message, details });
      return;
    }
    next();
  };
}
