/**
 * Maintenance-Skript
 *
 * LLM-Instanzen aus der MongoDB entfernen
 *
 * MongoDB script to delete all LLM instances
 * Run with: mongosh --port 27018 -u rb_root -p rb_secret --authenticationDatabase admin raueberbude < delete-llm-instances.js
 *
 * @author Corat
 */
/* eslint-disable */
use raueberbude;
db.llminstances.deleteMany({});
print("✅ All LLM instances deleted");
print("Count: " + db.llminstances.countDocuments());

