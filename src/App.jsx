import React, { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { getFacebookPages, initFacebookSdk, loginWithFacebook } from "./facebook";
import { Plus, Building2, Trash2 } from "lucide-react";

const FACEBOOK_APP_ID = import.meta.env.VITE_FACEBOOK_APP_ID;

export default function App() {
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [brands, setBrands] = useState([]);
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [newBrandName, setNewBrandName] = useState("");

  const [accounts, setAccounts] = useState([]);
  const [connectionTests, setConnectionTests] = useState({});
  const [platform, setPlatform] = useState("facebook");
  const [accountName, setAccountName] = useState("");
  const [pageId, setPageId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [tokenExpiresAt, setTokenExpiresAt] = useState("");
  const [facebookConnecting, setFacebookConnecting] = useState(false);
  const [facebookPages, setFacebookPages] = useState([]);
  const [facebookError, setFacebookError] = useState("");
  const [savingFacebookPageId, setSavingFacebookPageId] = useState(null);

  const [postContent, setPostContent] = useState("");
  const [selectedSocialAccountId, setSelectedSocialAccountId] = useState("");
  const [scheduledPosts, setScheduledPosts] = useState([]);
  const [savingDraft, setSavingDraft] = useState(false);
  const [draftScheduleTimes, setDraftScheduleTimes] = useState({});
  const [schedulingPostId, setSchedulingPostId] = useState(null);

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
    if (selectedBrand) {
      loadAccounts(selectedBrand.id);
      loadScheduledPosts(selectedBrand.id);
    }
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
    setConnectionTests({});
  }

  async function loadScheduledPosts(brandId) {
    const { data, error } = await supabase
      .from("scheduled_posts")
      .select("*")
      .eq("brand_id", brandId)
      .order("created_at", { ascending: false });

    if (error) return alert(error.message);

    setScheduledPosts(data || []);
    setDraftScheduleTimes({});
  }

  async function saveDraft() {
    if (!selectedBrand) return alert("Select a brand first.");
    if (!selectedSocialAccountId) return alert("Select a Facebook account.");
    if (!postContent.trim()) return alert("Enter post content.");

    setSavingDraft(true);

    const { error } = await supabase.from("scheduled_posts").insert({
      brand_id: selectedBrand.id,
      social_account_id: selectedSocialAccountId,
      user_id: session.user.id,
      content: postContent.trim(),
      status: "draft",
    });

    setSavingDraft(false);

    if (error) return alert(error.message);

    setPostContent("");
    setSelectedSocialAccountId("");
    loadScheduledPosts(selectedBrand.id);
  }

  async function scheduleDraftPost(postId) {
    const scheduledAt = draftScheduleTimes[postId];
    if (!scheduledAt) return alert("Choose a date and time.");

    const scheduledDate = new Date(scheduledAt);
    if (scheduledDate <= new Date()) {
      return alert("Scheduled time must be in the future.");
    }

    setSchedulingPostId(postId);

    const { error } = await supabase
      .from("scheduled_posts")
      .update({
        scheduled_at: scheduledDate.toISOString(),
        status: "scheduled",
      })
      .eq("id", postId);

    setSchedulingPostId(null);

    if (error) return alert(error.message);

    loadScheduledPosts(selectedBrand.id);
  }

  function formatDateTime(iso) {
    if (!iso) return "—";
    return new Date(iso).toLocaleString();
  }

  function statusStyle(status) {
    if (status === "published") return styles.statusPublished;
    if (status === "failed") return styles.statusFailed;
    if (status === "scheduled") return styles.statusScheduled;
    return styles.statusDraft;
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

  async function connectFacebook() {
    if (!selectedBrand) return alert("Select a brand first.");
    if (!FACEBOOK_APP_ID) {
      return alert("Facebook App ID is not configured. Add VITE_FACEBOOK_APP_ID to your .env file.");
    }

    setFacebookError("");
    setFacebookPages([]);
    setFacebookConnecting(true);

    try {
      await initFacebookSdk(FACEBOOK_APP_ID);
      const userToken = await loginWithFacebook();
      const pages = await getFacebookPages(userToken);

      if (!pages.length) {
        setFacebookError("No Facebook pages found for this account.");
        return;
      }

      setFacebookPages(pages);
    } catch (err) {
      setFacebookError(err.message || "Facebook connection failed.");
    } finally {
      setFacebookConnecting(false);
    }
  }

  async function saveFacebookPage(page) {
    if (!selectedBrand || !session) return;

    setSavingFacebookPageId(page.id);

    const { error } = await supabase.from("social_accounts").insert({
      brand_id: selectedBrand.id,
      user_id: session.user.id,
      platform: "facebook",
      account_name: page.name,
      page_id: page.id,
      access_token: page.access_token,
      token_expires_at: null,
    });

    setSavingFacebookPageId(null);

    if (error) return alert(error.message);

    setFacebookPages([]);
    setFacebookError("");
    loadAccounts(selectedBrand.id);
  }

  function cancelFacebookPagePicker() {
    setFacebookPages([]);
    setFacebookError("");
  }

  async function deleteAccount(id) {
    const yes = confirm("Delete this social account?");
    if (!yes) return;

    const { error } = await supabase.from("social_accounts").delete().eq("id", id);

    if (error) return alert(error.message);

    loadAccounts(selectedBrand.id);
  }

  async function testConnection(account) {
    const accountId = account.id;

    setConnectionTests((prev) => ({
      ...prev,
      [accountId]: { status: "testing" },
    }));

    const page_id = account.page_id;
    const access_token = account.access_token;

    if (!page_id || !access_token) {
      setConnectionTests((prev) => ({
        ...prev,
        [accountId]: {
          status: "failed",
          errorMessage: "Page ID and access token are required.",
        },
      }));
      return;
    }

    const url = `https://graph.facebook.com/v25.0/${page_id}?fields=id,name,followers_count&access_token=${access_token}`;

    try {
      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok || data.error) {
        setConnectionTests((prev) => ({
          ...prev,
          [accountId]: {
            status: "failed",
            errorMessage: data.error?.message || "Connection failed",
          },
        }));
        return;
      }

      setConnectionTests((prev) => ({
        ...prev,
        [accountId]: {
          status: "connected",
          pageName: data.name,
          pageId: data.id,
          followersCount: data.followers_count,
        },
      }));
    } catch (err) {
      setConnectionTests((prev) => ({
        ...prev,
        [accountId]: {
          status: "failed",
          errorMessage: err.message || "Network error",
        },
      }));
    }
  }

  function platformIcon(name) {
    if (name === "facebook") return "📘";
    if (name === "instagram") return "📸";
    if (name === "youtube") return "▶️";
    if (name === "tiktok") return "🎵";
    if (name === "linkedin") return "💼";
    return <Building2 size={20} />;
  }

  const facebookAccounts = accounts.filter((a) => a.platform === "facebook");

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
                <h2>{scheduledPosts.filter((p) => p.status === "scheduled").length}</h2>
              </div>

              <div style={styles.card}>
                <p>Unreplied Comments</p>
                <h2>0</h2>
              </div>
            </div>

            <div style={styles.twoColumns}>
              <div style={styles.panel}>
                <h2>Add Social Account</h2>

                <button
                  style={{
                    ...styles.button,
                    ...styles.facebookButton,
                    opacity: facebookConnecting ? 0.6 : 1,
                    cursor: facebookConnecting ? "wait" : "pointer",
                  }}
                  disabled={facebookConnecting}
                  onClick={connectFacebook}
                >
                  {facebookConnecting ? "Connecting…" : "Connect Facebook"}
                </button>

                {facebookError && <p style={styles.errorText}>{facebookError}</p>}

                {facebookPages.length > 0 && (
                  <div style={styles.pagePicker}>
                    <p style={styles.label}>Choose a Facebook page</p>
                    {facebookPages.map((page) => (
                      <button
                        key={page.id}
                        type="button"
                        style={styles.pageOption}
                        disabled={savingFacebookPageId === page.id}
                        onClick={() => saveFacebookPage(page)}
                      >
                        {savingFacebookPageId === page.id ? "Saving…" : page.name}
                      </button>
                    ))}
                    <button type="button" style={styles.cancelButton} onClick={cancelFacebookPagePicker}>
                      Cancel
                    </button>
                  </div>
                )}

                <p style={styles.divider}>or add manually</p>

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
                  accounts.map((account) => {
                    const test = connectionTests[account.id];

                    return (
                      <div key={account.id} style={styles.accountCard}>
                        <div style={styles.accountIcon}>{platformIcon(account.platform)}</div>

                        <div style={{ flex: 1 }}>
                          <div style={styles.accountCardHeader}>
                            <div>
                              <h3 style={{ margin: 0 }}>{account.account_name}</h3>
                              <p style={styles.muted}>{account.platform}</p>
                            </div>
                            {test?.status === "connected" && (
                              <span style={styles.statusConnected}>● Connected</span>
                            )}
                            {test?.status === "failed" && (
                              <span style={styles.statusFailed}>● Failed</span>
                            )}
                          </div>

                          <p style={styles.smallText}>Page ID: {account.page_id || "Not added"}</p>
                          <p style={styles.smallText}>
                            Token expiry:{" "}
                            {account.token_expires_at
                              ? new Date(account.token_expires_at).toLocaleString()
                              : "Not added"}
                          </p>

                          <button
                            type="button"
                            style={{
                              ...styles.testButton,
                              opacity: test?.status === "testing" ? 0.6 : 1,
                              cursor: test?.status === "testing" ? "wait" : "pointer",
                            }}
                            disabled={test?.status === "testing"}
                            onClick={() => testConnection(account)}
                          >
                            {test?.status === "testing" ? "Testing…" : "Test Connection"}
                          </button>

                          {test?.status === "connected" && (
                            <div style={styles.testResult}>
                              <div style={styles.resultRow}>
                                <span style={styles.resultLabel}>Page name</span>
                                <span>{test.pageName}</span>
                              </div>
                              <div style={styles.resultRow}>
                                <span style={styles.resultLabel}>Page ID</span>
                                <span>{test.pageId}</span>
                              </div>
                              <div style={styles.resultRow}>
                                <span style={styles.resultLabel}>Followers count</span>
                                <span>
                                  {test.followersCount != null
                                    ? test.followersCount.toLocaleString()
                                    : "—"}
                                </span>
                              </div>
                            </div>
                          )}

                          {test?.status === "failed" && test.errorMessage && (
                            <p style={styles.errorText}>{test.errorMessage}</p>
                          )}
                        </div>

                        <button style={styles.deleteButton} onClick={() => deleteAccount(account.id)}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div style={{ ...styles.panel, marginTop: 24 }}>
              <h2>Post Scheduler</h2>
              <p style={styles.muted}>Draft and schedule Facebook posts for {selectedBrand.name}</p>

              <label style={styles.label}>Brand</label>
              <select
                style={styles.input}
                value={selectedBrand.id}
                onChange={(e) => {
                  const brand = brands.find((b) => b.id === e.target.value);
                  if (brand) setSelectedBrand(brand);
                }}
              >
                {brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </select>

              <label style={styles.label}>Facebook Account</label>
              <select
                style={styles.input}
                value={selectedSocialAccountId}
                onChange={(e) => setSelectedSocialAccountId(e.target.value)}
              >
                <option value="">Select a connected Facebook account</option>
                {facebookAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.account_name}
                  </option>
                ))}
              </select>

              {facebookAccounts.length === 0 && (
                <p style={styles.muted}>Connect a Facebook account above to schedule posts.</p>
              )}

              <label style={styles.label}>Post Content</label>
              <textarea
                style={{ ...styles.input, minHeight: 100, resize: "vertical" }}
                placeholder="Write your post..."
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
              />

              <button
                style={{
                  ...styles.button,
                  opacity: savingDraft ? 0.6 : 1,
                  cursor: savingDraft ? "wait" : "pointer",
                }}
                disabled={savingDraft || facebookAccounts.length === 0}
                onClick={saveDraft}
              >
                {savingDraft ? "Saving…" : "Save Draft"}
              </button>

              <h3 style={{ marginTop: 32, marginBottom: 12 }}>Scheduled Posts</h3>

              {scheduledPosts.length === 0 ? (
                <p style={styles.muted}>No posts yet.</p>
              ) : (
                <div style={styles.tableWrap}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Content</th>
                        <th style={styles.th}>Scheduled Time</th>
                        <th style={styles.th}>Status</th>
                        <th style={styles.th}>Created Time</th>
                        <th style={styles.th}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scheduledPosts.map((post) => (
                        <tr key={post.id}>
                          <td style={styles.td}>{post.content}</td>
                          <td style={styles.td}>{formatDateTime(post.scheduled_at)}</td>
                          <td style={styles.td}>
                            <span style={statusStyle(post.status)}>{post.status}</span>
                          </td>
                          <td style={styles.td}>{formatDateTime(post.created_at)}</td>
                          <td style={styles.td}>
                            {post.status === "draft" && (
                              <div style={styles.scheduleRow}>
                                <input
                                  style={styles.scheduleInput}
                                  type="datetime-local"
                                  value={draftScheduleTimes[post.id] || ""}
                                  onChange={(e) =>
                                    setDraftScheduleTimes((prev) => ({
                                      ...prev,
                                      [post.id]: e.target.value,
                                    }))
                                  }
                                />
                                <button
                                  type="button"
                                  style={{
                                    ...styles.scheduleButton,
                                    opacity: schedulingPostId === post.id ? 0.6 : 1,
                                    cursor: schedulingPostId === post.id ? "wait" : "pointer",
                                  }}
                                  disabled={schedulingPostId === post.id}
                                  onClick={() => scheduleDraftPost(post.id)}
                                >
                                  {schedulingPostId === post.id ? "Scheduling…" : "Schedule"}
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
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
  facebookButton: { width: "100%", background: "#1877f2", marginTop: 0, marginBottom: 12 },
  pagePicker: { marginBottom: 12, padding: 12, background: "#1c1c26", borderRadius: 10, border: "1px solid #2a2a38" },
  pageOption: { width: "100%", padding: "10px 12px", marginBottom: 8, borderRadius: 8, border: "1px solid #2a2a38", background: "#252536", color: "#f0f0f8", cursor: "pointer", textAlign: "left" },
  cancelButton: { background: "transparent", color: "#8a8aa8", border: "none", cursor: "pointer", fontSize: 12, padding: 0 },
  divider: { color: "#8a8aa8", fontSize: 12, textAlign: "center", margin: "8px 0 4px" },
  cards: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20, marginBottom: 28 },
  card: { background: "#13131a", border: "1px solid #2a2a38", borderRadius: 16, padding: 24 },
  twoColumns: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 },
  panel: { background: "#13131a", border: "1px solid #2a2a38", borderRadius: 16, padding: 24 },
  label: { display: "block", fontSize: 12, color: "#8a8aa8", marginBottom: 6, marginTop: 12 },
  accountCard: { display: "flex", gap: 14, alignItems: "flex-start", background: "#1c1c26", border: "1px solid #2a2a38", padding: 16, borderRadius: 12, marginBottom: 12 },
  accountCardHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 4 },
  accountIcon: { width: 42, height: 42, borderRadius: 12, background: "#252536", display: "flex", alignItems: "center", justifyContent: "center", color: "#7c5cfc", flexShrink: 0 },
  testButton: { marginTop: 10, padding: "8px 14px", borderRadius: 8, border: "1px solid #7c5cfc", background: "rgba(124,92,252,0.15)", color: "#f0f0f8", fontSize: 12, cursor: "pointer" },
  testResult: { marginTop: 12, padding: 12, background: "#13131a", borderRadius: 8, border: "1px solid #2a2a38", fontSize: 13 },
  resultRow: { marginBottom: 8 },
  resultLabel: { display: "block", fontSize: 10, color: "#8a8aa8", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 },
  statusConnected: { color: "#5cf8c8", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" },
  statusScheduled: { color: "#7c5cfc", fontSize: 12, fontWeight: 600, textTransform: "capitalize" },
  statusPublished: { color: "#5cf8c8", fontSize: 12, fontWeight: 600, textTransform: "capitalize" },
  statusDraft: { color: "#8a8aa8", fontSize: 12, fontWeight: 600, textTransform: "capitalize" },
  statusFailed: { color: "#fc5c7d", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" },
  tableWrap: { overflowX: "auto", marginTop: 8 },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th: {
    textAlign: "left",
    padding: "10px 12px",
    borderBottom: "1px solid #2a2a38",
    color: "#8a8aa8",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  td: {
    padding: "12px",
    borderBottom: "1px solid #2a2a38",
    verticalAlign: "top",
    maxWidth: 280,
    wordBreak: "break-word",
  },
  scheduleRow: { display: "flex", flexDirection: "column", gap: 8, minWidth: 180 },
  scheduleInput: {
    padding: 8,
    borderRadius: 8,
    border: "1px solid #2a2a38",
    background: "#1c1c26",
    color: "#fff",
    fontSize: 12,
  },
  scheduleButton: {
    padding: "8px 12px",
    borderRadius: 8,
    border: "none",
    background: "#7c5cfc",
    color: "#fff",
    fontSize: 12,
    cursor: "pointer",
  },
  errorText: { marginTop: 8, fontSize: 12, color: "#fc5c7d" },
  deleteButton: { background: "transparent", color: "#fc5c7d", border: "none", cursor: "pointer", flexShrink: 0 },
  loginPage: { minHeight: "100vh", background: "#0a0a0f", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontFamily: "Arial, sans-serif" },
  loginBox: { width: 360, background: "#13131a", padding: 32, borderRadius: 18, border: "1px solid #2a2a38" },
  input: { width: "100%", padding: 12, marginBottom: 12, borderRadius: 10, border: "1px solid #2a2a38", background: "#1c1c26", color: "#fff", boxSizing: "border-box" },
};
