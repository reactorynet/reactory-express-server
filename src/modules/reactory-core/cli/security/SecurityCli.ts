import Reactory from '@reactorynet/reactory-core';
import { ReadLine } from 'readline';
import colors from 'colors/safe';
import type {
  ISecurityService,
  CreateTokenOptions,
  ExpireTokensCriteria,
  TokenLifetime,
} from '../../services/SecurityService/types';

// ─── Color theme ─────────────────────────────────────────────────────────────
colors.setTheme({
  silly: 'rainbow',
  input: 'grey',
  verbose: 'cyan',
  prompt: 'grey',
  info: 'green',
  data: 'grey',
  help: 'cyan',
  warn: 'yellow',
  debug: 'blue',
  error: 'red',
});

// ─── Help text ────────────────────────────────────────────────────────────────
const HelpText = `
The security CLI tool manages JWT tokens for Reactory user accounts.

Commands:
  create-token        Create a new JWT token for a user
  expire-tokens       Expire (clear) all active tokens for a user or matching users
  list-tokens         List the active session tokens stored on a user

Global options:
  -v --verbose        Enable verbose output
  -h --help           Show this help message

──────────────────────────────────────────────────────────────────────────────

create-token  -u <userId|email>  [options]

  -u  --user      <userId|email>   User to create a token for (required)
  -l  --long-lived                 Create a long-lived token  (30 days)
  -s  --short-lived                Create a short-lived token (15 minutes)
      --expires-in   <amount>      Custom expiry amount (integer)
      --expires-unit <unit>        Custom expiry unit: minutes|hours|days|weeks
                                   (requires --expires-in)
      --issuer  <iss>              Override JWT issuer claim
      --subject <sub>              Override JWT subject claim
      --audience <aud>             Override JWT audience claim

  Examples:
    reactory security create-token -u alice@example.com
    reactory security create-token -u alice@example.com --long-lived
    reactory security create-token -u 64abc123 --expires-in 2 --expires-unit hours

──────────────────────────────────────────────────────────────────────────────

expire-tokens  -u <userId|email|pattern>  [options]

  -u  --user    <value>   Expire tokens for a single user (id or email)
  -p  --pattern <regex>   Expire tokens for all users whose email matches
                          the given regular expression

  Examples:
    reactory security expire-tokens -u alice@example.com
    reactory security expire-tokens -u 64abc123
    reactory security expire-tokens --pattern "@example\\.com$"

──────────────────────────────────────────────────────────────────────────────

list-tokens  -u <userId|email>

  -u  --user  <userId|email>   User whose tokens you want to list (required)

  Examples:
    reactory security list-tokens -u alice@example.com
    reactory security list-tokens -u 64abc123

──────────────────────────────────────────────────────────────────────────────
`;

type ReactoryCliApp = Reactory.Server.TCli;

// ─── Argument parser ──────────────────────────────────────────────────────────

interface ParsedArgs {
  command: string;
  user: string;
  pattern: string;
  longLived: boolean;
  shortLived: boolean;
  expiresIn: number | undefined;
  expiresUnit: string | undefined;
  issuer: string | undefined;
  subject: string | undefined;
  audience: string | undefined;
  verbose: boolean;
  help: boolean;
}

function parseArgs(kwargs: string[]): ParsedArgs {
  const result: ParsedArgs = {
    command: '',
    user: '',
    pattern: '',
    longLived: false,
    shortLived: false,
    expiresIn: undefined,
    expiresUnit: undefined,
    issuer: undefined,
    subject: undefined,
    audience: undefined,
    verbose: false,
    help: false,
  };

  // The first positional argument is the sub-command (e.g. "create-token")
  let idx = 0;
  if (idx < kwargs.length && !kwargs[idx].startsWith('-')) {
    result.command = kwargs[idx++];
  }

  while (idx < kwargs.length) {
    let flag: string;
    let flagValue: string | null = null;

    const raw = kwargs[idx];

    if (raw.includes('=')) {
      [flag, flagValue] = raw.split('=');
    } else {
      flag = raw;
      // peek at next token as value if it doesn't start with '-'
      if (idx + 1 < kwargs.length && !kwargs[idx + 1].startsWith('-')) {
        flagValue = kwargs[idx + 1];
        idx++;
      }
    }

    switch (flag) {
      case '-u':
      case '--user':
        result.user = flagValue ?? '';
        break;
      case '-p':
      case '--pattern':
        result.pattern = flagValue ?? '';
        break;
      case '-l':
      case '--long-lived':
        result.longLived = true;
        break;
      case '-s':
      case '--short-lived':
        result.shortLived = true;
        break;
      case '--expires-in':
        result.expiresIn = flagValue ? parseInt(flagValue, 10) : undefined;
        break;
      case '--expires-unit':
        result.expiresUnit = flagValue ?? undefined;
        break;
      case '--issuer':
        result.issuer = flagValue ?? undefined;
        break;
      case '--subject':
        result.subject = flagValue ?? undefined;
        break;
      case '--audience':
        result.audience = flagValue ?? undefined;
        break;
      case '-v':
      case '--verbose':
        result.verbose = true;
        break;
      case '-h':
      case '--help':
        result.help = true;
        break;
      default:
        // Unknown flags are ignored gracefully
        break;
    }

    idx++;
  }

  return result;
}

// ─── Sub-command handlers ─────────────────────────────────────────────────────

async function handleCreateToken(
  args: ParsedArgs,
  svc: ISecurityService,
  rl: ReadLine
): Promise<void> {
  if (!args.user) {
    throw new Error('create-token requires -u / --user <userId|email>');
  }

  if (args.longLived && args.shortLived) {
    throw new Error('Cannot combine --long-lived and --short-lived');
  }

  const options: CreateTokenOptions = {};

  if (args.longLived) {
    options.lifetime = 'long';
  } else if (args.shortLived) {
    options.lifetime = 'short';
  } else if (args.expiresIn !== undefined) {
    options.expiresInAmount = args.expiresIn;
    options.expiresInUnit =
      (args.expiresUnit as CreateTokenOptions['expiresInUnit']) ?? 'hours';
  } else {
    options.lifetime = 'standard';
  }

  if (args.issuer) options.issuer = args.issuer;
  if (args.subject) options.subject = args.subject;
  if (args.audience) options.audience = args.audience;

  const result = await svc.createToken(args.user, options);

  rl.write(colors.green('\n✓ Token created successfully\n\n'));
  rl.write(colors.cyan(`  User ID   : ${result.userId}\n`));
  rl.write(colors.cyan(`  Expires At: ${result.expiresAt}\n`));
  rl.write(colors.cyan(`  Lifetime  : ${options.lifetime ?? 'custom'}\n\n`));
  rl.write(colors.yellow('  Token:\n'));
  rl.write(colors.white(`  ${result.token}\n\n`));

  if (args.verbose) {
    rl.write(colors.gray('  Payload:\n'));
    rl.write(
      colors.gray(`  ${JSON.stringify(result.payload, null, 2).split('\n').join('\n  ')}\n\n`)
    );
  }
}

async function handleExpireTokens(
  args: ParsedArgs,
  svc: ISecurityService,
  rl: ReadLine
): Promise<void> {
  if (!args.user && !args.pattern) {
    throw new Error(
      'expire-tokens requires -u / --user <userId|email> or -p / --pattern <regex>'
    );
  }

  const criteria: ExpireTokensCriteria = {};

  if (args.pattern) {
    criteria.emailPattern = args.pattern;
    rl.write(colors.yellow(`\nExpiring tokens for users matching: ${args.pattern}\n`));
  } else {
    // Try to detect whether the value looks like a Mongo ObjectId
    const isObjectId = /^[a-f\d]{24}$/i.test(args.user);
    if (isObjectId) {
      criteria.userId = args.user;
    } else {
      criteria.email = args.user;
    }
    rl.write(colors.yellow(`\nExpiring tokens for: ${args.user}\n`));
  }

  const result = await svc.expireTokens(criteria);

  rl.write(colors.green('\n✓ Expiry operation complete\n\n'));
  rl.write(colors.cyan(`  Users affected   : ${result.usersAffected}\n`));
  rl.write(colors.cyan(`  Sessions cleared : ${result.sessionsCleared}\n`));

  if (result.errors.length > 0) {
    rl.write(colors.red(`\n  Errors (${result.errors.length}):\n`));
    result.errors.forEach(e => {
      rl.write(colors.red(`    - [${e.userId}] ${e.error}\n`));
    });
  }

  rl.write('\n');
}

async function handleListTokens(
  args: ParsedArgs,
  svc: ISecurityService,
  rl: ReadLine
): Promise<void> {
  if (!args.user) {
    throw new Error('list-tokens requires -u / --user <userId|email>');
  }

  const tokens = await svc.listActiveTokens(args.user);

  if (tokens.length === 0) {
    rl.write(colors.yellow(`\nNo active sessions found for: ${args.user}\n\n`));
    return;
  }

  rl.write(colors.cyan(`\nActive sessions for: ${args.user} (${tokens.length} total)\n`));
  rl.write(colors.cyan('─'.repeat(60) + '\n\n'));

  tokens.forEach((t, i) => {
    const status = t.isValid
      ? colors.green('VALID')
      : colors.red('EXPIRED');
    rl.write(colors.white(`  [${i + 1}] ${t.sessionId}\n`));
    rl.write(colors.gray(`      Status    : ${status}\n`));
    rl.write(colors.gray(`      Host      : ${t.host}\n`));
    rl.write(colors.gray(`      Client    : ${t.client}\n`));
    rl.write(colors.gray(`      Issued At : ${t.issuedAt ?? 'unknown'}\n`));
    rl.write(colors.gray(`      Expires At: ${t.expiresAt ?? 'unknown'}\n`));
    rl.write('\n');
  });
}

// ─── Main CLI handler ─────────────────────────────────────────────────────────

/**
 * Security CLI tool - manage JWT tokens for Reactory user accounts.
 *
 * @param kwargs  Raw string arguments passed by the CLI runner
 * @param context Reactory execution context
 */
const SecurityCli = async (
  kwargs: string[],
  context: Reactory.Server.IReactoryContext
): Promise<void> => {
  const rl: ReadLine = context.readline as ReadLine;

  if (kwargs.length === 0 || kwargs.includes('-h') || kwargs.includes('--help')) {
    rl.write(colors.green(HelpText));
    process.exit(0);
  }

  const args = parseArgs(kwargs);

  if (args.help) {
    rl.write(colors.green(HelpText));
    process.exit(0);
  }

  if (!args.command) {
    context.error('No command provided. Use -h or --help for usage information.');
    process.exit(1);
  }

  // Load the SecurityService
  let securityService: ISecurityService;
  try {
    securityService = context.getService<ISecurityService>('core.SecurityService@1.0.0');
  } catch (err: any) {
    context.error(`Failed to load SecurityService: ${err.message}`);
    process.exit(1);
  }

  if (!securityService) {
    context.error('SecurityService is not available. Ensure it is registered in the core module.');
    process.exit(1);
  }

  try {
    switch (args.command) {
      case 'create-token':
        await handleCreateToken(args, securityService, rl);
        break;

      case 'expire-tokens':
        await handleExpireTokens(args, securityService, rl);
        break;

      case 'list-tokens':
        await handleListTokens(args, securityService, rl);
        break;

      default:
        context.error(
          `Unknown command: "${args.command}". Use -h or --help for usage information.`
        );
        process.exit(1);
    }
  } catch (err: any) {
    context.error(`Error: ${err.message}`);
    if (args.verbose) {
      context.error(err.stack);
    }
    process.exit(1);
  }
};

// ─── CLI definition ───────────────────────────────────────────────────────────

type ReactoryCliDefinition = Reactory.IReactoryComponentDefinition<ReactoryCliApp>;

const SecurityCliDefinition: ReactoryCliDefinition = {
  nameSpace: 'core',
  name: 'Security',
  version: '1.0.0',
  description: HelpText,
  component: SecurityCli as unknown as ReactoryCliApp,
  domain: Reactory.ComponentDomain.plugin,
  features: [
    {
      feature: 'Security',
      featureType: Reactory.FeatureType.function,
      action: ['security', 'jwt', 'token'],
      stem: 'security',
    },
  ],
  overwrite: false,
  roles: ['SYSTEM', 'ADMIN'],
  stem: 'security',
  tags: ['security', 'jwt', 'token', 'cli', 'auth'],
  toString(includeVersion?: boolean) {
    return includeVersion
      ? `${this.nameSpace}.${this.name}@${this.version}`
      : this.name;
  },
};

export default SecurityCliDefinition;
