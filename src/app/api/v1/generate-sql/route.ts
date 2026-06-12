import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { token_id, host, token_name } = await request.json();
    if (!token_id || !host) return NextResponse.json({ error: 'Missing params' }, { status: 400 });

    const canaryUrl = `${host}/file/${token_id}`;
    
    // Generate a decoy SQL dump file
    // By embedding an IMG tag in a vulnerable field, we can trigger the canary
    // if the database dump is imported and viewed in a vulnerable web-based admin panel (like old phpMyAdmin).
    // Or we simply put the link there to tempt them to visit it.
    const sqlContent = `
-- MySQL dump 10.13  Distrib 8.0.30, for Linux (x86_64)
-- Host: localhost    Database: production_main
-- ------------------------------------------------------
-- Server version	8.0.30

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table \`admin_users\`
--

DROP TABLE IF EXISTS \`admin_users\`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE \`admin_users\` (
  \`id\` int NOT NULL AUTO_INCREMENT,
  \`username\` varchar(255) NOT NULL,
  \`password_hash\` varchar(255) NOT NULL,
  \`email\` varchar(255) NOT NULL,
  \`avatar_url\` varchar(500) DEFAULT NULL,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table \`admin_users\`
--

LOCK TABLES \`admin_users\` WRITE;
/*!40000 ALTER TABLE \`admin_users\` DISABLE KEYS */;
INSERT INTO \`admin_users\` VALUES (1,'admin','$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi','admin@company.local','${canaryUrl}'),(2,'system_bot','$2y$10$abcdefghijklmnopqrstuv','system@company.local','');
/*!40000 ALTER TABLE \`admin_users\` ENABLE KEYS */;
UNLOCK TABLES;

-- Dump completed on ${new Date().toISOString()}
`;

    return new NextResponse(sqlContent, {
      status: 200,
      headers: {
        'Content-Type': 'application/sql',
        'Content-Disposition': `attachment; filename="${token_name || 'production_backup'}.sql"`,
      },
    });
  } catch (err) {
    console.error('SQL Generation Error:', err);
    return NextResponse.json({ error: 'SQL Generation Failed' }, { status: 500 });
  }
}
