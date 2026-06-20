/**
 * EmailStep - Sends emails via the Reactory email service
 *
 * Config shape (from YAML `inputs` JSON):
 *   to:            "user@example.com"         (required — recipient address or array of addresses)
 *   subject:       "Email subject"            (required — email subject line)
 *   body:          "Plain text body"          (optional — plain-text email body)
 *   html:          "<h1>HTML body</h1>"       (optional — HTML email body)
 *   from:          "sender@example.com"       (optional — override sender address)
 *   cc:            [ "cc@example.com" ]       (optional — CC recipients)
 *   bcc:           [ "bcc@example.com" ]      (optional — BCC recipients)
 *   attachments:   [ { filename, path } ]     (optional — file attachments)
 *   templateId:    "welcome-template"         (optional — email template identifier)
 *   templateData:  { name: "John" }           (optional — data to render in the template)
 *
 * Output: { sent, messageId }
 */

import { BaseYamlStep } from '@reactory/server-modules/reactory-core/workflow/YamlFlow/steps/base/BaseYamlStep';
import {
  StepExecutionContext,
  StepExecutionResult,
  ValidationResult,
} from '@reactory/server-modules/reactory-core/workflow/YamlFlow/steps/interfaces/IYamlStep';

/**
 * Configuration interface for email attachments
 */
export interface EmailAttachment {
  /** File name for the attachment */
  filename: string;

  /** Path to the attachment file or a URL */
  path?: string;

  /** Base64-encoded content */
  content?: string;

  /** MIME content type */
  contentType?: string;
}

/**
 * Configuration interface for EmailStep
 */
export interface EmailStepConfig {
  /** Recipient address or array of addresses */
  to: string | string[];

  /** Email subject line */
  subject: string;

  /** Plain-text email body */
  body?: string;

  /** HTML email body */
  html?: string;

  /** Override sender address */
  from?: string;

  /** CC recipients */
  cc?: string[];

  /** BCC recipients */
  bcc?: string[];

  /** File attachments */
  attachments?: EmailAttachment[];

  /** Email template identifier */
  templateId?: string;

  /** Data to render in the template */
  templateData?: Record<string, any>;

  /** Whether step is enabled */
  enabled?: boolean;
}

/**
 * Step for sending emails within a YAML workflow
 */
export class EmailStep extends BaseYamlStep {
  public readonly stepType = 'email';

  /**
   * Execute the email sending step
   * @param context - Execution context
   * @returns Promise resolving to execution result
   */
  protected async executeStep(context: StepExecutionContext): Promise<StepExecutionResult> {
    const config = this.config as EmailStepConfig;

    if (!context.reactoryContext) {
      return {
        success: false,
        error: 'No Reactory context available — cannot send email',
        outputs: {},
        metadata: {},
      };
    }

    // Resolve template variables in all string config fields
    const resolvedTo = Array.isArray(config.to)
      ? config.to.map((addr) => this.resolveTemplate(addr, context))
      : this.resolveTemplate(config.to, context);
    const resolvedSubject = this.resolveTemplate(config.subject, context);
    const resolvedBody = config.body
      ? this.resolveTemplate(config.body, context)
      : undefined;
    const resolvedHtml = config.html
      ? this.resolveTemplate(config.html, context)
      : undefined;
    const resolvedFrom = config.from
      ? this.resolveTemplate(config.from, context)
      : undefined;
    const resolvedCc = config.cc
      ? config.cc.map((addr) => this.resolveTemplate(addr, context))
      : undefined;
    const resolvedBcc = config.bcc
      ? config.bcc.map((addr) => this.resolveTemplate(addr, context))
      : undefined;
    const resolvedTemplateId = config.templateId
      ? this.resolveTemplate(config.templateId, context)
      : undefined;
    const resolvedTemplateData = config.templateData
      ? this.resolveParams(config.templateData, context)
      : undefined;

    const recipientList = Array.isArray(resolvedTo) ? resolvedTo.join(', ') : resolvedTo;
    context.logger.info(`Sending email to ${recipientList}: "${resolvedSubject}"`);

    try {
      const emailService = this.getEmailService(context);

      if (!emailService) {
        return {
          success: false,
          error: 'Email service not available in the Reactory context',
          outputs: {},
          metadata: { to: resolvedTo, subject: resolvedSubject },
        };
      }

      // Build the email payload
      const emailPayload: Record<string, any> = {
        to: resolvedTo,
        subject: resolvedSubject,
      };

      if (resolvedBody) emailPayload.body = resolvedBody;
      if (resolvedBody) emailPayload.text = resolvedBody;
      if (resolvedHtml) emailPayload.html = resolvedHtml;
      if (resolvedFrom) emailPayload.from = resolvedFrom;
      if (resolvedCc) emailPayload.cc = resolvedCc;
      if (resolvedBcc) emailPayload.bcc = resolvedBcc;
      if (config.attachments) emailPayload.attachments = config.attachments;
      if (resolvedTemplateId) emailPayload.templateId = resolvedTemplateId;
      if (resolvedTemplateData) emailPayload.templateData = resolvedTemplateData;

      let result: any;

      // Try different method signatures that the email service might expose
      if (resolvedTemplateId && typeof emailService.sendTemplateEmail === 'function') {
        result = await emailService.sendTemplateEmail({
          ...emailPayload,
          template: resolvedTemplateId,
          data: resolvedTemplateData,
        });
      } else if (typeof emailService.sendEmail === 'function') {
        result = await emailService.sendEmail(emailPayload);
      } else if (typeof emailService.send === 'function') {
        result = await emailService.send(emailPayload);
      } else {
        return {
          success: false,
          error: 'Email service does not expose a sendEmail, sendTemplateEmail, or send method',
          outputs: {},
          metadata: { to: resolvedTo, subject: resolvedSubject },
        };
      }

      const messageId = result?.messageId || result?.id || null;
      const sent = result?.sent !== undefined ? result.sent : true;

      context.logger.info(
        `Email sent successfully to ${recipientList}${messageId ? ` (messageId: ${messageId})` : ''}`,
      );

      return {
        success: true,
        outputs: {
          sent,
          messageId,
        },
        metadata: {
          to: resolvedTo,
          subject: resolvedSubject,
          from: resolvedFrom || null,
          templateId: resolvedTemplateId || null,
          hasAttachments: !!(config.attachments && config.attachments.length > 0),
        },
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      context.logger.error(`Email sending failed: ${message}`);
      return {
        success: false,
        error: message,
        outputs: { sent: false, messageId: null },
        metadata: {
          to: resolvedTo,
          subject: resolvedSubject,
        },
      };
    }
  }

  /**
   * Validate the step configuration
   * @param config - Configuration to validate
   * @returns Validation result
   */
  public validateConfig(config: Record<string, any>): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate 'to' field
    if (!config.to) {
      errors.push('to is required — must be a string or array of email addresses');
    } else if (typeof config.to !== 'string' && !Array.isArray(config.to)) {
      errors.push('to must be a string or array of strings');
    } else if (Array.isArray(config.to) && config.to.length === 0) {
      errors.push('to array must contain at least one email address');
    }

    // Validate subject
    if (!config.subject || typeof config.subject !== 'string') {
      errors.push('subject is required and must be a string');
    }

    // Must have either body, html, or templateId
    if (!config.body && !config.html && !config.templateId) {
      errors.push('At least one of body, html, or templateId must be provided');
    }

    if (config.body && typeof config.body !== 'string') {
      errors.push('body must be a string');
    }

    if (config.html && typeof config.html !== 'string') {
      errors.push('html must be a string');
    }

    if (config.from && typeof config.from !== 'string') {
      errors.push('from must be a string');
    }

    if (config.cc && !Array.isArray(config.cc)) {
      errors.push('cc must be an array of strings');
    }

    if (config.bcc && !Array.isArray(config.bcc)) {
      errors.push('bcc must be an array of strings');
    }

    if (config.attachments) {
      if (!Array.isArray(config.attachments)) {
        errors.push('attachments must be an array');
      } else {
        config.attachments.forEach((att: any, idx: number) => {
          if (!att.filename || typeof att.filename !== 'string') {
            errors.push(`attachments[${idx}].filename is required and must be a string`);
          }
          if (!att.path && !att.content) {
            errors.push(`attachments[${idx}] must have either a path or content`);
          }
        });
      }
    }

    if (config.templateId && typeof config.templateId !== 'string') {
      errors.push('templateId must be a string');
    }

    if (config.templateData && typeof config.templateData !== 'object') {
      errors.push('templateData must be an object');
    }

    if (config.templateId && !config.templateData) {
      warnings.push('templateId is set but no templateData is provided — the template may render with empty fields');
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Resolve the email service from the Reactory context
   * @param context - Execution context
   * @returns Email service or null
   */
  private getEmailService(context: StepExecutionContext): any {
    try {
      const svc = context.reactoryContext.getService(
        'core.EmailService@1.0.0',
      ) as any;
      if (svc) return svc;
    } catch {
      // Service not available
    }

    try {
      const svc = context.reactoryContext.getService(
        'core.ReactoryEmailService@1.0.0',
      ) as any;
      if (svc) return svc;
    } catch {
      // Service not available
    }

    try {
      const svc = context.reactoryContext.getService(
        'core.SendMailService@1.0.0',
      ) as any;
      if (svc) return svc;
    } catch {
      // Service not available
    }

    return null;
  }

  /**
   * Deep-resolve template strings inside a params object
   * @param params - Parameters to resolve
   * @param context - Execution context
   * @returns Resolved parameters
   */
  private resolveParams(params: any, context: StepExecutionContext): any {
    if (typeof params === 'string') {
      return this.resolveTemplate(params, context);
    }
    if (Array.isArray(params)) {
      return params.map((p) => this.resolveParams(p, context));
    }
    if (params && typeof params === 'object') {
      const resolved: Record<string, any> = {};
      for (const [key, value] of Object.entries(params)) {
        resolved[key] = this.resolveParams(value, context);
      }
      return resolved;
    }
    return params;
  }
}
