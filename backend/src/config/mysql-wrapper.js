import mysql from 'mysql2';

// Exportar los tipos que necesitas
export const { ResultSetHeader, RowDataPacket } = mysql;

// Exportar el pool promisificado
export const createPool = (config) => {
  return mysql.createPool(config).promise();
};