declare module "google-robotstxt-parser" {
  export class RobotsMatcher {
    allowedByRobots(robotsTxt: string, userAgents: string[], url: string): boolean;
    oneAgentAllowedByRobots(robotsTxt: string, userAgent: string, url: string): boolean;
    getCrawlDelay(robotsTxt: string, userAgent: string): number | undefined;
    getSitemaps(robotsTxt: string): string[];
  }
}