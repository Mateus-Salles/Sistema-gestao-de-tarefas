import { Database } from "./Connection.js";
import { loadDatabaseConfig } from "../configs/database.config.js";

const database = new Database(loadDatabaseConfig());

export { Database }
export default database;
