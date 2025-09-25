import sqlite3 from 'sqlite3';
import fs from 'fs/promises';
import path from 'path';

const DB_PATH = './database/yogii.db';

class Database {
  constructor() {
    this.db = null;
  }

  async initialize() {
    try {
      // 确保数据库目录存在
      await fs.mkdir('./database', { recursive: true });
      
      // 创建数据库连接
      this.db = new sqlite3.Database(DB_PATH, (err) => {
        if (err) {
          console.error('Error opening database:', err.message);
        } else {
          console.log('📁 Connected to SQLite database');
        }
      });

      // SQLite 性能优化
      await this.run("PRAGMA journal_mode = WAL");
      await this.run("PRAGMA synchronous = NORMAL");
      await this.run("PRAGMA cache_size = 10000");
      await this.run("PRAGMA temp_store = memory");
      await this.run("PRAGMA foreign_keys = ON");

      // 初始化数据库结构
      await this.initializeSchema();
      
      console.log('🗄️ Database initialized successfully');
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw error;
    }
  }

  async initializeSchema() {
    try {
      const schemaPath = path.join('./database', 'schema.sql');
      const schema = await fs.readFile(schemaPath, 'utf8');
      
      // 分割SQL语句并执行
      const statements = schema.split(';').filter(stmt => stmt.trim());
      
      for (const statement of statements) {
        if (statement.trim()) {
          await this.run(statement);
        }
      }
    } catch (error) {
      console.error('Failed to initialize schema:', error);
      throw error;
    }
  }

  // 包装sqlite3的run方法为Promise
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID, changes: this.changes });
        }
      });
    });
  }

  // 包装sqlite3的get方法为Promise
  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  // 包装sqlite3的all方法为Promise
  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  // 关闭数据库连接
  close() {
    return new Promise((resolve, reject) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) {
            reject(err);
          } else {
            console.log('🔒 Database connection closed');
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }
}

// 创建单例实例
const database = new Database();

export default database;
