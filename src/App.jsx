import React, { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { Plus, Building2 } from "lucide-react";

export default function App() {
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [brands, setBrands] = useState([]);
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [newBrandName, setNewBrandName] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) loadBrands();
  }, [session]);

  async function login() {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) alert(error.message);
  }

  async function logout() {
    await supabase.auth.signOut();
  }

  async function loadBrands() {
    const { data, error } = await supabase
      .from("brands")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      alert(error.message);
      return;
    }

    setBrands(data || []);
    if (data?.length && !selectedBrand) {
      setSelectedBrand(data[0]);
    }
  }

  async function addBrand() {
    if (!newBrandName.trim()) return;

    const { error } = await supabase.from("brands").insert({
      name: newBrandName,
      color: "#7c5cfc",
    });

    if (error) {
      alert(error.message);
      return;
    }

    setNewBrandName("");
    loadBrands();
  }

  if (!session) {
    return (
      <div style={styles.loginPage}>
        <div style={styles.loginBox}>
          <h1>Shepard</h1>
          <p>Login to manage your brands</p>

          <input
            style={styles.input}
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            style={styles.input}
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button style={styles.button} onClick={login}>
            Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.app}>
      <aside style={styles.sidebar}>
        <h2>Shepard</h2>
        <p style={styles.muted}>Brand Dashboard</p>

        <div style={styles.sectionTitle}>Brands</div>

        {brands.map((brand) => (
          <button
            key={brand.id}
            onClick={() => setSelectedBrand(brand)}
            style={{
              ...styles.brandButton,
              background:
                selectedBrand?.id === brand.id ? "#252536" : "transparent",
            }}
          >
            <span
              style={{
                ...styles.dot,
                background: brand.color || "#7c5cfc",
              }}
            />
            {brand.name}
          </button>
        ))}

        <div style={styles.addBox}>
          <input
            style={styles.smallInput}
            placeholder="New brand"
            value={newBrandName}
            onChange={(e) => setNewBrandName(e.target.value)}
          />
          <button style={styles.addButton} onClick={addBrand}>
            <Plus size={16} />
          </button>
        </div>

        <button style={styles.logout} onClick={logout}>
          Logout
        </button>
      </aside>

      <main style={styles.main}>
        {selectedBrand ? (
          <>
            <div style={styles.header}>
              <div>
                <h1>{selectedBrand.name}</h1>
                <p style={styles.muted}>Monitor all social accounts under this brand</p>
              </div>
              <button style={styles.button}>+ Add Social Account</button>
            </div>

            <div style={styles.cards}>
              <div style={styles.card}>
                <Building2 />
                <p>Total Accounts</p>
                <h2>0</h2>
              </div>

              <div style={styles.card}>
                <p>Followers</p>
                <h2>—</h2>
              </div>

              <div style={styles.card}>
                <p>Scheduled Posts</p>
                <h2>0</h2>
              </div>

              <div style={styles.card}>
                <p>Unreplied Comments</p>
                <h2>0</h2>
              </div>
            </div>
          </>
        ) : (
          <h1>Add your first brand</h1>
        )}
      </main>
    </div>
  );
}

const styles = {
  app: {
    display: "flex",
    minHeight: "100vh",
    background: "#0a0a0f",
    color: "#f0f0f8",
    fontFamily: "Arial, sans-serif",
  },
  sidebar: {
    width: 260,
    background: "#13131a",
    padding: 24,
    borderRight: "1px solid #2a2a38",
  },
  main: {
    flex: 1,
    padding: 40,
  },
  muted: {
    color: "#8a8aa8",
  },
  sectionTitle: {
    marginTop: 32,
    marginBottom: 12,
    fontSize: 12,
    textTransform: "uppercase",
    color: "#8a8aa8",
  },
  brandButton: {
    width: "100%",
    padding: 12,
    borderRadius: 10,
    border: "none",
    color: "#f0f0f8",
    textAlign: "left",
    display: "flex",
    alignItems: "center",
    gap: 10,
    cursor: "pointer",
    marginBottom: 6,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: "50%",
  },
  addBox: {
    display: "flex",
    gap: 8,
    marginTop: 16,
  },
  smallInput: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    border: "1px solid #2a2a38",
    background: "#1c1c26",
    color: "#fff",
  },
  addButton: {
    width: 42,
    borderRadius: 8,
    border: "none",
    background: "#7c5cfc",
    color: "#fff",
    cursor: "pointer",
  },
  logout: {
    marginTop: 32,
    background: "transparent",
    color: "#8a8aa8",
    border: "none",
    cursor: "pointer",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 32,
  },
  button: {
    padding: "12px 18px",
    borderRadius: 10,
    border: "none",
    background: "#7c5cfc",
    color: "#fff",
    cursor: "pointer",
  },
  cards: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 20,
  },
  card: {
    background: "#13131a",
    border: "1px solid #2a2a38",
    borderRadius: 16,
    padding: 24,
  },
  loginPage: {
    minHeight: "100vh",
    background: "#0a0a0f",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#fff",
    fontFamily: "Arial, sans-serif",
  },
  loginBox: {
    width: 360,
    background: "#13131a",
    padding: 32,
    borderRadius: 18,
    border: "1px solid #2a2a38",
  },
  input: {
    width: "100%",
    padding: 12,
    marginBottom: 12,
    borderRadius: 10,
    border: "1px solid #2a2a38",
    background: "#1c1c26",
    color: "#fff",
  },
};
