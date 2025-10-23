import { eventEmitter } from "../events.js";
import type { CoreConfig, DetectedProject, DiscoveryResult } from "../types.js";
import { createLogger } from "../utils/logger.js";
import { axiosDetector } from "./detectors/axios.js";
import { fetchDetector } from "./detectors/fetch.js";

export async function discoverAPIs(
  project: DetectedProject,
  cfg?: CoreConfig
): Promise<DiscoveryResult> {
  const logger = createLogger(cfg?.logger);
  logger.log("info", "Starting API discovery");

  // Built-in detectors
  const detectors = cfg?.detectors || [fetchDetector, axiosDetector];

  const results: Partial<DiscoveryResult>[] = [];

  for (const detector of detectors) {
    if (detector.supports(project)) {
      logger.log("debug", `Running detector: ${detector.name}`);
      try {
        const result = await detector.discover(project, { logger });
        results.push(result);
      } catch (error) {
        logger.log("error", `Detector ${detector.name} failed`, { error });
      }
    } else {
      logger.log(
        "debug",
        `Skipping detector: ${detector.name} (not supported)`
      );
    }
  }

  // Merge results
  const merged: DiscoveryResult = {
    rest: [],
    graphql: [],
    baseUrls: [],
    notes: [],
  };

  for (const result of results) {
    if (result.rest) merged.rest.push(...result.rest);
    if (result.graphql) merged.graphql.push(...result.graphql);
    if (result.baseUrls) merged.baseUrls.push(...result.baseUrls);
    if (result.notes) merged.notes.push(...result.notes);
  }

  // Deduplicate baseUrls
  merged.baseUrls = Array.from(new Set(merged.baseUrls));

  // Deduplicate endpoints
  merged.rest = deduplicateRestEndpoints(merged.rest);

  logger.log("info", "API discovery complete", {
    restCount: merged.rest.length,
    graphqlCount: merged.graphql.length,
    baseUrlCount: merged.baseUrls.length,
  });

  eventEmitter.emit("discovered", merged);
  return merged;
}

function deduplicateRestEndpoints(endpoints: any[]): any[] {
  const seen = new Map();
  for (const endpoint of endpoints) {
    const key = `${endpoint.method}:${endpoint.path}`;
    if (!seen.has(key)) {
      seen.set(key, endpoint);
    }
  }
  return Array.from(seen.values());
}
