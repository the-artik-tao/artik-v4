import { resolve } from "path";
import { ProjectIndexer } from "./src/indexer/index.js";

/**
 * Test script for the Project Indexer
 * Tests indexing on the demo-app
 */
async function testIndexer() {
  console.log("🧪 Testing Project Indexer\n");

  const demoAppPath = resolve(process.cwd(), "../../examples/demo-app");
  console.log(`Demo app path: ${demoAppPath}\n`);

  const indexer = new ProjectIndexer(demoAppPath);

  try {
    // Build index
    await indexer.buildIndex();

    // Get stats
    const stats = indexer.getStats();
    console.log("\n✅ Indexing complete!");
    console.log("\nFinal Stats:");
    console.log(JSON.stringify(stats, null, 2));

    // Get index
    const index = indexer.getIndex();
    console.log("\n📋 Components found:");
    for (const [name, component] of index.components.entries()) {
      console.log(`  - ${name} (${component.filePath})`);
      console.log(
        `    Props: ${component.props.map((p) => p.name).join(", ")}`
      );
      console.log(`    JSX: ${component.jsxStructure}`);
      console.log(
        `    Has embedding: ${index.embeddings.has(name) ? "✅" : "❌"}`
      );
    }

    console.log("\n🎉 Test passed!");
  } catch (error) {
    console.error("\n❌ Test failed:", error);
    process.exit(1);
  }
}

testIndexer();
