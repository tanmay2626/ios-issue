import React, { useEffect, useState, useRef } from "react";
import Footer from "./footer";
import { getGameStats, updateGameStats } from "../api";
import { motion } from "framer-motion";
import Confetti from "react-confetti";
import styled, { keyframes, css } from "styled-components";

import { GameStat, TapEgg, AllEggs } from "./tutorial";
import {
  determineRechargeMultiple,
  formatRank,
  getLeagueCoinsLimit,
  getLeagueName,
} from "../utils/libs";

import Header from "./header";
import { useNavigate } from "react-router-dom";
import ClaimEggModal from "./claimEggModal";
import Cookies from "js-cookie";
import GuideModal from "./info";

const tele = window.Telegram?.WebApp;
const shakeAnimation = keyframes`
  0%, 100% { transform: translate3d(0, 0, 0); }
  10%, 50%, 90% { transform: translate3d(-2px, -2px, 0); }
  20%, 80% { transform: translate3d(2px, 2px, 0); }
  30%, 70% { transform: translate3d(-2px, 2px, 0); }
`;

const ShakeContainer = styled.div.attrs((props) => ({
  className: props.className, // pass down className if needed
}))`
  animation: ${({ shake }) =>
    shake
      ? css`
          ${shakeAnimation} 0.82s cubic-bezier(.36,.07,.19,.97) both
        `
      : "none"};
  transform: translate3d(0, 0, 0);
  will-change: transform; // Promote animation to its own layer
  backface-visibility: hidden;
  perspective: 1000px;
`;

const GameStatPosition = styled.div`
  position: absolute;
  left: 0;
  top: 200px;
  padding: 20px 10px;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 10px;
  z-index: 50;
  will-change: transform, opacity; // Optimize for transformations and opacity changes
`;

const TapEggPosition = styled.div`
  position: absolute;
  bottom: 0;
  left: 60%;
  transform: translateX(-50%);
  z-index: 50;
  will-change: transform; // Optimize for transformations
`;

const AllEggsPosition = styled.div`
  position: absolute;
  left: 10px;
  top: 278px;
  padding: 20px 10px;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 10px;
  z-index: 50;
  will-change: transform, opacity;
`;

const Home = () => {
  const [tap, setTap] = useState(0);
  const isInitialMount = useRef(true);
  const [prevPoints, setPrevPoints] = useState(0);
  const [prevTaps, setPrevTaps] = useState(0);
  const [shake, setShake] = useState(false);
  const [points, setPoints] = useState(0);
  const [currPoints, setCurrPoints] = useState(0);
  const [currTaps, setCurrTaps] = useState(0);
  const [energy, setEnergy] = useState(100);
  const [taps, setTaps] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [selectedEgg, setSelectedEgg] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [runConfetti, setRunConfetti] = useState(false);
  const [eggTheme, setEggTheme] = useState({
    lvl: 1,
    limit: 1000000,
  });
  const [showGuide, setShowGuide] = useState(false);
  const [timeoutId, setTimeoutId] = useState(null);
  const [showInfo, setShowInfo] = useState(false);
  const [gameData, setGameData] = useState({
    rank: 1,
    league: 1,
    currRechargeLvl: 0,
    currTurboLvl: 0,
  });
  const [currentGuideStep, setCurrentGuideStep] = useState(1);

  const goToNextGuideStep = () => {
    if (currentGuideStep < 6) {
      setCurrentGuideStep(currentGuideStep + 1);
    } else {
      setShowGuide(false);
      Cookies.set("Guide", true);
    }
  };
  const [leagueData, setLeagueData] = useState(null);
  const navigate = useNavigate();
  const handlebooster = () => {
    navigate("/booster");
  };
  const [coins, setCoins] = useState([]);
  const [launchIndex, setLaunchIndex] = useState(0);

  const directions = [-150, 0, 150];

  const addCoin = () => {
    const newCoin = {
      id: Math.random(),
      direction: directions[launchIndex],
      y: -50,
    };
    setCoins((currentCoins) => [...currentCoins, newCoin]);

    setLaunchIndex((launchIndex + 1) % 3);

    setTimeout(() => {
      setCoins((currentCoins) =>
        currentCoins.filter((coin) => coin.id !== newCoin.id)
      );
    }, 3000);
  };

  const play = () => {
    new Audio("/tap.wav").play();
  };

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
    } else {
      play();
    }
  }, [tap]);

  useEffect(() => {
    const shouldShowGuide = Cookies.get("Guide") === undefined;
    setShowGuide(shouldShowGuide);
  }, []);

  const closeGuide = () => {
    Cookies.set("Guide", true);
    setShowGuide(false);
  };

  const navToEgg = () => {
    navigate("/nft");
  };
  const renderCurrentGuideStep = () => {
    switch (currentGuideStep) {
      case 1:
        return (
          <GameStatPosition>
            <GameStat onNext={goToNextGuideStep} onClose={closeGuide} />
          </GameStatPosition>
        );
      case 2:
        return (
          <TapEggPosition>
            <TapEgg onNext={goToNextGuideStep} onClose={closeGuide} />
          </TapEggPosition>
        );
      case 3:
        return (
          <AllEggsPosition>
            <AllEggs onNext={navToEgg} onClose={closeGuide} />
          </AllEggsPosition>
        );
      default:
        return null;
    }
  };
  const eggLevels = [1, 2, 3, 4, 5];


  const handleLevelResponse = (lvl) => {
    if (lvl < eggTheme.lvl) {
      setSelectedEgg(lvl);
      setShowModal(true);
    }
  };

  const handleCloseInfo = () => {
    setShowInfo(false);
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };
  const [isDisabled, setIsDisabled] = useState(false); // State to manage tap disable

  const handleTap = () => {
    if (isDisabled) return; // Prevents tapping when disabled

    if (energy > 0) {
      setTap((prev) => prev + 1);
      addCoin();
      setShake(true);
      setCurrPoints((prev) => prev + gameData.currTurboLvl);
      setPoints((prev) => prev + gameData.currTurboLvl);
      setEnergy((prev) => Math.max(0, prev - 1));
      setCurrTaps((prev) => prev + 1);
      setTaps((prev) => prev + 1);
      setTimeout(() => setShake(false), 560);

      clearTimeout(timeoutId);
      const newTimeoutId = setTimeout(async () => {
        const updatedGameStats = {
          coins: currPoints + gameData.currTurboLvl + 1,
          numberOfTaps: currTaps + 1,
          currentEnergyLevel: energy,
          lastActivityTime: Date.now(),
        };
      }, 700);
      setTimeoutId(newTimeoutId);
    } else {
      setIsDisabled(true);
      setTimeout(() => setIsDisabled(false), 20000);
    }
  };

  const determineEggTheme = (noOfTaps) => {
    if (noOfTaps === 16000000) {
      setRunConfetti(true);

      setTimeout(() => {
        setRunConfetti(false);
      }, 5000);
    } else if (noOfTaps === 8000000) {
      setRunConfetti(true);

      setTimeout(() => {
        setRunConfetti(false);
      }, 5000);
    } else if (noOfTaps === 4000000) {
      setRunConfetti(true);

      setTimeout(() => {
        setRunConfetti(false);
      }, 5000);
    } else if (noOfTaps === 2000000) {
      setRunConfetti(true);

      setTimeout(() => {
        setRunConfetti(false);
      }, 5000);
    } else if (noOfTaps === 1000000) {
      setRunConfetti(true);

      setTimeout(() => {
        setRunConfetti(false);
      }, 5000);
    }
    if (noOfTaps >= 16000000) {
      setEggTheme({
        lvl: 6,
        limit: 0,
      });
    } else if (noOfTaps >= 8000000) {
      setEggTheme({
        lvl: 5,
        limit: 16000000,
      });
    } else if (noOfTaps >= 4000000) {
      setEggTheme({
        lvl: 4,
        limit: 8000000,
      });
    } else if (noOfTaps >= 2000000) {
      setEggTheme({
        lvl: 3,
        limit: 4000000,
      });
    } else if (noOfTaps >= 1000000) {
      setEggTheme({
        lvl: 2,
        limit: 2000000,
      });
    } else {
      setEggTheme({
        lvl: 1,
        limit: 1000000,
      });
    }
  };

  useEffect(() => {
    if (energy < 1000) {
      const interval = setInterval(() => {
        setEnergy((currentEnergy) => {
          if (currentEnergy < 1000) {
            return (
              currentEnergy +
              determineRechargeMultiple(gameData.currRechargeLvl)
            );
          } else {
            clearInterval(interval);
            return 1000;
          }
        });
      }, 1000);
      return () => clearInterval(interval);
    } else if (energy >= 1000) {
      setEnergy(1000);
    }
  }, [energy, gameData.currRechargeLvl]);

  useEffect(() => {}, [currTaps, currPoints, points, taps]);

  useEffect(() => {
    fetchGameStats();
  }, [showGuide]);

  useEffect(() => {
    determineEggTheme(prevPoints + points);
  }, [prevPoints, points]);

  useEffect(() => {
    const getUserData = async () => {
      try {
        if (tele) {
          await tele.ready();
          tele.BackButton.hide();
        } else {
          console.error("Telegram WebApp API not available");
        }
      } catch (error) {
        console.error("Error fetching user data from Telegram:", error);
      }
    };
    getUserData();
  }, []);

  return (
    <div className="bg-tertiary select-none relative rounded-lg flex flex-col h-screen px-3 py-2 max-w-xl mx-auto">
      {isLoading ? (
        <div className="h-screen w-screen flex justify-center items-center">
          <img src="/images/loading.gif" alt="loader" />
        </div>
      ) : (
        <>
          <Header />
          {/* After Header */}
          {showGuide && (
            <div
              disabled
              className="h-full w-full fixed top-0 bottom-0 left-0 right-0"
              style={{
                backgroundColor: "rgba(0, 0, 0, 0.7)",
                zIndex: 49,
              }}
            />
          )}

          <div
            className="rounded-3xl flex flex-col top-0 bottom-0 left-0 right-0 justify-between items-center mb-2"
            style={{
              backgroundImage: 'url("/images/game-stats.png")',
              backgroundSize: "cover",
              backgroundRepeat: "no-repeat",
            }}
          >
            {/* Coins */}
            <div
              className={`flex flex-col ${
                showGuide && currentGuideStep === 1 && "z-50"
              }  justify-between items-start w-full pt-1 px-2`}
            >
              <div className="flex justify-between items-start h-full w-full py-2 px-3">
                <div className="flex items-center overflow-hidden">
                  <img src="/images/coin.png" className="mr-1 w-8 h-8" />
                  <span
                    className={`text-primary font-bold text-[1.8rem] h-full flex items-center`}
                  >
                    {(prevPoints + points).toLocaleString()}
                  </span>
                </div>

                <div
                  onClick={handlebooster}
                  className="bg-white rounded-full w-24 cursor-pointer flex py-2 gap-1 justify-center items-center"
                >
                  <img src="/images/lightning.png" className="w-6 h-6" />
                  <span className="text-sm font-medium text-black uppercase">
                    Boost
                  </span>
                </div>
              </div>
              <div className="w-full flex justify-between pt-1 px-3">
                <span className="text-white text-[0.8rem] font-bold">
                  Energy Cap
                </span>
                <span className="text-white text-[0.8rem] font-bold">
                  {Math.floor((energy / 1000) * 100)}%
                </span>
              </div>
              <div className="rounded-full w-full mt-1 px-3">
                <div className="h-2 backdrop-blur-4xl bg-white/15 rounded-full">
                  <div
                    className="bg-gradient-to-r from-primary to-white h-3 rounded-full"
                    style={{ width: `${Math.floor((energy / 1000) * 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>
            <div
              className={`flex ${
                showGuide && currentGuideStep === 1 && "z-50"
              }   justify-between items-center w-full py-2 rounded-b-3xl mt-4`}
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.174)",
                backdropFilter: "blur(1px)",
              }}
            >
              <div
                onClick={() => {
                  navigate("/leaderboard");
                }}
                className="flex items-center px-4 mx-auto w-[70%] justify-between"
              >
                <div className="flex items-center gap-1">
                  <img className="w-8 h-8 pr-1" src={`/images/${leagueData}`} />
                  <span
                    className="text-primary text-base uppercase font-medium"
                    style={{ letterSpacing: "4px" }}
                  >
                    {getLeagueName(gameData.league).name}
                  </span>
                </div>
                <div className="text-white text-3xl">.</div>
                <div className="flex items-center">
                  <img className="w-5 h-5 pr-1" src={`/images/leaves.svg`} />
                  <span className="text-base text-primary">
                    {formatRank(gameData.rank)}
                  </span>
                  <img
                    className="w-5 h-5 pl-1"
                    src={`/images/leaves-right.svg`}
                  />
                </div>
              </div>
              <div>
                <img className="w-6 h-6 pr-4" src={`/images/right.svg`} />
              </div>
            </div>
          </div>

          {/* //!Here i want gamestat component */}
          {showInfo && <GuideModal closeInfo={handleCloseInfo} />}
          <div
            className={`rounded-2xl ${
              showGuide && currentGuideStep === 3 && "z-50"
            }  border-2 -z-1 flex flex-col flex-grow mb-20 border-borderModal p-3 bg-cover bg-center bg-no-repeat`}
            style={{
              backgroundImage: 'url("/images/pattern.svg")',
            }}
          >
            <div className="text-gray-400 flex justify-between items-center text-[0.8rem] gap-2 underline italic">
              <div onClick={() => setShowInfo(true)}>Whats inside ?</div>
              <div>
                <div className="bg-black w-full rounded-full p-2 flex gap-1">
                  {eggLevels.map((lvl) => (
                    <div key={lvl}>
                      <img
                        className={`w-4 h-4 pr-1 ${
                          lvl <= eggTheme.lvl ? "" : "opacity-50"
                        }`}
                        src={`/eggs/level${lvl}.png`}
                        alt={`Egg level ${lvl}`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* //!Here i want AllEggs component */}

            {/* Egg */}
            <div
              style={{}}
              className="flex-grow h-full w-full justify-center items-center py-2"
            >
              {coins.map((coin) => (
                <motion.img
                  key={coin.id}
                  src="/images/coin-ios.png"
                  initial={{ x: 0, y: coin.y, opacity: 1 }}
                  animate={{
                    x: [0, coin.direction * 0.4, coin.direction],
                    y: [coin.y, coin.y - 300, window.innerHeight - 420],
                    opacity: [1, 1, 0],
                  }}
                  transition={{
                    duration: 2,
                    ease: "easeInOut",
                    times: [0, 0.2, 0.9],
                  }}
                  style={{
                    width: "50px",
                    height: "50px",
                    position: "absolute",
                    left: "50%",
                    marginLeft: "-25px",
                    marginTop: "70px",
                    zIndex: 0,
                    willChange: "transform, opacity",
                  }}
                />
              ))}
              <div
                disabled={energy <= 0}
                className="flex justify-center items-center"
                style={{ minHeight: "100%" }}
              >
                {shake ? (
                  <ShakeContainer
                    className="flex justify-center items-center"
                    shake={shake}
                    style={{ minHeight: "100%" }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        zIndex: -1,
                        borderRadius: "60%", // Assuming the egg image is rounded
                        boxShadow: `
      0px 0px 40px 20px rgba(66, 255, 251, 0.5),
      0px 0px 80px 40px rgba(66, 255, 251, 0.6),
      0px 0px 120px 60px rgba(66, 255, 251, 0.7),
      0px 0px 160px 70px rgba(66, 255, 251, 0.8),
      0px 0px 100px 40px rgba(66, 255, 251, 0.9),
      0px 0px 240px 70px rgba(66, 255, 251, 1)
    `,
                      }}
                    ></div>
                    <img
                      onClick={handleTap}
                      disabled={energy <= 0}
                      src={`/eggs/level${eggTheme.lvl}.png`}
                      className="text-yellow-400 w-[40%] h-auto rounded-full"
                      style={{
                        maxHeight: "100%",
                        maxWidth: "100%",
                      }}
                    />
                  </ShakeContainer>
                ) : (
                  <>
                    <div
                      style={{
                        position: "absolute",
                        zIndex: 1,
                        borderRadius: "60%", // Assuming the egg image is rounded
                        boxShadow: `
      0px 0px 40px 20px rgba(66, 255, 251, 0.5),
      0px 0px 80px 40px rgba(66, 255, 251, 0.6),
      0px 0px 120px 60px rgba(66, 255, 251, 0.7),
      0px 0px 160px 70px rgba(66, 255, 251, 0.8),
      0px 0px 100px 40px rgba(66, 255, 251, 0.9),
      0px 0px 240px 70px rgba(66, 255, 251, 1)
    `,
                      }}
                    ></div>
                    <img
                      onClick={!showGuide && handleTap}
                      disabled={energy <= 0}
                      src={`/eggs/level${eggTheme.lvl}.png`}
                      className={` w-[40%] h-auto rounded-full ${
                        showGuide && currentGuideStep === 2 ? "z-50" : "z-20"
                      }`}
                      style={{ maxHeight: "100%", maxWidth: "100%" }}
                    />
                  </>
                )}
              </div>
            </div>

            {/* //!Here i want Tapegg component  */}

            {/* EggStatus */}
            <div className={`rounded-2xl flex items-center w-full`}>
              <div className="relative w-full">
                <div className="mb-2 flex items-center justify-between text-xs">
                  <div className="flex gap-1 text-sm text-black font-bold">
                    <span>Goal: </span>
                    <img src="/images/coin.png" className="w-5 h-5" />
                    <span>{getLeagueCoinsLimit(gameData?.league).limit}</span>
                  </div>
                  <div className="text-black text-sm font-bold">
                    {Math.min(
                      100,
                      ((prevPoints + points) / eggTheme.limit) * 100
                    ).toFixed(2)}
                    %
                  </div>
                </div>
                <div className=" flex h-12 bg-gray-400/25 overflow-hidden rounded-full  w-full text-xs">
                  <div
                    style={{
                      width: `${Math.floor(
                        Math.min(
                          100,
                          ((prevPoints + points) / eggTheme.limit) * 100
                        )
                      )}%`,
                    }}
                    className={`bg-gradient-to-r from-lvl${eggTheme.lvl}-start via-lvl${eggTheme.lvl}-mid to-lvl${eggTheme.lvl}-end rounded-r-full`}
                  ></div>
                </div>
              </div>
            </div>
          </div>
          <Footer />
          {showModal && (
            <ClaimEggModal
              lvl={selectedEgg}
              handleCloseModal={handleCloseModal}
              fetchGameStats={fetchGameStats}
            />
          )}
          {runConfetti && (
            <Confetti width={window.innerWidth} height={window.innerHeight} />
          )}
        </>
      )}
      {showGuide && renderCurrentGuideStep()}
    </div>
  );
};

export default Home;
