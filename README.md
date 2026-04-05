# 🚀 VBWorld Full Stack Project

A full-stack application with:

* ⚙️ Backend: Spring Boot (Java)
* 🌐 Frontend: Vite + React
* 🗄️ Database: PostgreSQL

---

## ✨ Features

* Role-based authentication (Admin, Warehouse, Manager, Branch)
* Inventory & stock management
* POS (Point of Sale) system
* Smart ordering system
* Reporting & analytics
* Swagger API documentation

---

## 📦 Requirements

Make sure you have installed:

* Node.js (v18+)
* Java (17+)
* Maven
* PostgreSQL

---

## 📁 Project Structure

```
vbworld/
  Backend/       # Spring Boot API
  Frontend/      # Vite React app
  DB/
    backup.sql   # PostgreSQL backup (includes schema + data)
  .gitignore
  README.md
```

---

## 🗄️ Database Setup

### 1. Create Database

```
createdb vbworld
```

### 2. Create User

```
CREATE USER vbworld_user WITH PASSWORD 'vbworld@2026';
ALTER DATABASE vbworld OWNER TO vbworld_user;
```

### 3. Restore Backup

```
psql -U vbworld_user -d vbworld -f DB/backup.sql
```

> ⚠️ Note: The backup already contains schema and demo data.
> No additional setup or migrations are required.

---

## ⚙️ Backend Setup (Spring Boot)

```
cd Backend
mvn clean install
mvn spring-boot:run
```

### 🔧 Alternative (IDE - Eclipse)

* Main class: `VbworldApiApplication`
* VM Arguments:

```
-Dspring.profiles.active=dev
```

---

## 🌐 Frontend Setup (Vite)

```
cd Frontend
npm install
npm run dev
```

---

## 🚀 Run Order

1. Start PostgreSQL
2. Start Backend
3. Start Frontend

---

## 🔗 Access URLs

* Backend API: http://localhost:8080
* Frontend App: http://localhost:5173
* Swagger Docs: http://localhost:8080/swagger-ui.html

---

## 👤 Demo Users (Mock Data)

The application includes preloaded demo users for testing different roles.

👉 Password for all users: `password`

---

### 👑 Admin

```
admin@vbworld.in
```

* Full system access
* User management
* Reports & analytics
* Global oversight

---

### 🏭 Warehouse Admin

```
warehouse@vbworld.in
```

* Stock management
* Lot tracking
* Supplier management
* Warehouse operations

---

### 📦 Manager

```
manager@vbworld.in
```

* Restricted warehouse access
* Limited controls

---

### 🛒 Branch User (POS)

```
ravi@vbworld.in
```

* Branch dashboard
* Smart ordering
* Order history
* Customer management
* POS screens

---

## 🔐 Environment Variables (Optional)

Create a `.env` file (recommended for future production setup):

```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=vbworld
DB_USER=vbworld_user
DB_PASSWORD=vbworld@2026

JWT_SECRET=your_secret_key
```

---

## ⚠️ Important Notes

* Do NOT commit `.env`
* Do NOT commit `node_modules/`, `target/`, or `dist/`
* Ensure PostgreSQL is running before backend
* If frontend fails → run `npm install` again
* If backend fails → verify DB config in `application-dev.yml`

---

## 🛠️ Useful Commands

### Backend

```
mvn clean install
mvn spring-boot:run
```

### Frontend

```
npm install
npm run dev
```

---

## 🎯 You're Good to Go!

Clone → Setup DB → Run backend → Run frontend 🚀

---

## 💡 Future Improvements

* Docker setup (run everything in 1 command)
* CI/CD pipeline
* Production deployment
* Environment-based config management
