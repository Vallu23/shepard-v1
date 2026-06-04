import React, { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { Plus, Building2, Trash2 } from "lucide-react";

export default function App() {
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [brands, setBrands] = useState([]);
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [newBrandName, setNewBrandName] = useState("");

  const [accounts, setAccounts] = useState([]);
  const [platform, setPlatform] = useState("facebook");
  const [accountName, setAccountName] = useState("");
  const [pageId, setPageId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [tokenExpiresAt, setTokenExpiresAt] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) loadBrands();
  }, [session]);

  useEffect(() => {
    if (selectedBrand) loadAccounts(selectedBrand.id);
  }, [selectedBrand]);

  async function login() {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
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

    if (error) return alert(error.message);

    setBrands(data || []);
    if (data?.length && !selectedBrand) setSelectedBrand(data[0]);
  }

  async function addBrand() {
    if (!newBrandName.trim()) return;

    const { error } = await supabase.from("brands").insert({
      name: newBrandName.trim(),
      color: "#7c5cfc",
    });

    if (error) return alert(error.message);

    setNewBrandName("");
    loadBrands();
  }

  async function loadAccounts(brandId) {
    const { data, error } = await supabase
      .from("social_accounts")
      .select("*")
      .eq("brand_id", brandId)
      .order("created_at", { ascending: true });

    if (error) return alert(error.message);

    setAccounts(data || []);
  }

  async function addAccount() {
    if (!selectedBrand) return alert("Select a brand first.");
    if (!accountName.trim()) return alert("Add account name first.");

    const { error } = await supabase.from("social_accounts").insert({
      brand_id: selectedBrand.id,
      platform,
      account_name: accountName.trim(),
      page_id: pageId.trim() || null,
      access_token: accessToken.trim() || null,
      token_expires_at: tokenExpiresAt || null,
    });

    if (error) return alert(error.message);

    setAccountName("");
    setPageId("");
    setAccessToken("");
    setTokenExpiresAt("");
    loadAccounts(selectedBrand.id);
  }

  async function deleteAccount(id) {
    const yes = confirm("Delete this social account?");
    if (!yes) return;

    const { error } = await supabase.from("social_accounts").delete().eq("id", id);

    if (error) return alert(error.message);

    loadAccounts(selectedBrand.id);
  }

  function platformIcon(name) {
  if (name === "facebook") return "📘";
  if (name === "instagram") return "📸";
  if (name === "youtube") return "▶️";
  if (name === "tiktok") return "🎵";
  if (name === "linkedin") return "💼";
  return <Building2 size={20} />;
}

  if (!session) {
    return (
      <div style={styles.loginPage}>
        <div style={styles.loginBox}>
          <h1>Shepard</h1>
          <p>Login to manage your brands</p>

          <input style={styles.input} placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input style={styles.input} type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />

          <button style={styles.button} onClick={login}>Login</button>
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
              background: selectedBrand?.id === brand.id ? "#252536" : "transparent",
            }}
          >
            <span style={{ ...styles.dot, background: brand.color || "#7c5cfc" }} />
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

        <button style={styles.logout} onClick={logout}>Logout</button>
      </aside>

      <main style={styles.main}>
        {selectedBrand ? (
          <>
            <div style={styles.header}>
              <div>
                <h1>{selectedBrand.name}</h1>
                <p style={styles.muted}>Monitor all social accounts under this brand</p>
              </div>
            </div>

            <div style={styles.cards}>
              <div style={styles.card}>
                <Building2 />
                <p>Total Accounts</p>
                <h2>{accounts.length}</h2>
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

            <div style={styles.twoColumns}>
              <div style={styles.panel}>
                <h2>Add Social Account</h2>

                <label style={styles.label}>Platform</label>
                <select style={styles.input} value={platform} onChange={(e) => setPlatform(e.target.value)}>
                  <option value="facebook">Facebook</option>
                  <option value="instagram">Instagram</option>
                  <option value="tiktok">TikTok</option>
                  <option value="youtube">YouTube</option>
                  <option value="linkedin">LinkedIn</option>
                </select>

                <label style={styles.label}>Account Name</label>
                <input
                  style={styles.input}
                  placeholder="Example: Lash Rehab Facebook"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                />

                <label style={styles.label}>Page / Account ID</label>
                <input
                  style={styles.input}
                  placeholder="Facebook Page ID"
                  value={pageId}
                  onChange={(e) => setPageId(e.target.value)}
                />

                <label style={styles.label}>Access Token</label>
                <input
                  style={styles.input}
                  placeholder="Paste token"
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                />

                <label style={styles.label}>Token Expires At</label>
                <input
                  style={styles.input}
                  type="datetime-local"
                  value={tokenExpiresAt}
                  onChange={(e) => setTokenExpiresAt(e.target.value)}
                />

                <button style={styles.button} onClick={addAccount}>Save Account</button>
              </div>

              <div style={styles.panel}>
                <h2>Connected Accounts</h2>

                {accounts.length === 0 ? (
                  <p style={styles.muted}>No social accounts added yet.</p>
                ) : (
                  accounts.map((account) => (
                    <div key={account.id} style={styles.accountCard}>
                      <div style={styles.accountIcon}>{platformIcon(account.platform)}</div>

                      <div style={{ flex: 1 }}>
                        <h3>{account.account_name}</h3>
                        <p style={styles.muted}>{account.platform}</p>
                        <p style={styles.smallText}>Page ID: {account.page_id || "Not added"}</p>
                        <p style={styles.smallText}>
                          Token expiry: {account.token_expires_at ? new Date(account.token_expires_at).toLocaleString() : "Not added"}
                        </p>
                      </div>

                      <button style={styles.deleteButton} onClick={() => deleteAccount(account.id)}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))
                )}
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
  app: { display: "flex", minHeight: "100vh", background: "#0a0a0f", color: "#f0f0f8", fontFamily: "Arial, sans-serif" },
  sidebar: { width: 260, background: "#13131a", padding: 24, borderRight: "1px solid #2a2a38" },
  main: { flex: 1, padding: 40 },
  muted: { color: "#8a8aa8" },
  smallText: { color: "#8a8aa8", fontSize: 12, margin: "4px 0" },
  sectionTitle: { marginTop: 32, marginBottom: 12, fontSize: 12, textTransform: "uppercase", color: "#8a8aa8" },
  brandButton: { width: "100%", padding: 12, borderRadius: 10, border: "none", color: "#f0f0f8", textAlign: "left", display: "flex", alignItems: "center", gap: 10, cursor: "pointer", marginBottom: 6 },
  dot: { width: 10, height: 10, borderRadius: "50%" },
  addBox: { display: "flex", gap: 8, marginTop: 16 },
  smallInput: { flex: 1, padding: 10, borderRadius: 8, border: "1px solid #2a2a38", background: "#1c1c26", color: "#fff" },
  addButton: { width: 42, borderRadius: 8, border: "none", background: "#7c5cfc", color: "#fff", cursor: "pointer" },
  logout: { marginTop: 32, background: "transparent", color: "#8a8aa8", border: "none", cursor: "pointer" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 },
  button: { padding: "12px 18px", borderRadius: 10, border: "none", background: "#7c5cfc", color: "#fff", cursor: "pointer", marginTop: 10 },
  cards: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20, marginBottom: 28 },
  card: { background: "#13131a", border: "1px solid #2a2a38", borderRadius: 16, padding: 24 },
  twoColumns: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 },
  panel: { background: "#13131a", border: "1px solid #2a2a38", borderRadius: 16, padding: 24 },
  label: { display: "block", fontSize: 12, color: "#8a8aa8", marginBottom: 6, marginTop: 12 },
  accountCard: { display: "flex", gap: 14, alignItems: "flex-start", background: "#1c1c26", border: "1px solid #2a2a38", padding: 16, borderRadius: 12, marginBottom: 12 },
  accountIcon: { width: 42, height: 42, borderRadius: 12, background: "#252536", display: "flex", alignItems: "center", justifyContent: "center", color: "#7c5cfc" },
  deleteButton: { background: "transparent", color: "#fc5c7d", border: "none", cursor: "pointer" },
  loginPage: { minHeight: "100vh", background: "#0a0a0f", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontFamily: "Arial, sans-serif" },
  loginBox: { width: 360, background: "#13131a", padding: 32, borderRadius: 18, border: "1px solid #2a2a38" },
  input: { width: "100%", padding: 12, marginBottom: 12, borderRadius: 10, border: "1px solid #2a2a38", background: "#1c1c26", color: "#fff", boxSizing: "border-box" },
};


